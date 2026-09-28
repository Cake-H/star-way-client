/**
 * 星途 · 破晓 WebGL 星球层（路线 C · 原生 WebGL 着色器，零框架）
 *
 * 视觉状态收敛为两个 uniform：
 *   uPhase ∈ [0,1]  破晓相位（0 = 原版金色常态 / 0.5 = 光带扫过球面中线 / 1 = 白昼恒星）
 *   uBright         亮度系数（1.0 常态 → 1.5 过冲 → 1.25 恒星态定格）
 * 全部由 useDawnTransition 的唯一 GSAP 时间线插值驱动，本层只做 gl.uniform1f。
 *
 * 失败策略：上下文创建 / 着色器编译 / 链接任一失败即 throw（响亮报错），
 * 由 HeroCanvas 捕获后保留原版 DOM 星球并显式标注 data-planet-gl="failed"，
 * 禁止静默退回 2D 贴纸星球。
 */

const VERT_SRC = `
attribute vec2 aP;
void main(){ gl_Position = vec4(aP, 0.0, 1.0); }
`

/*
 * v7.3 合并（规范第一节，合并规则优先级高于参照实现）：
 *   ① 夜光晕分支以线上现版为准 —— 临边抑制项（light·a³ / alpha a²(1-uPhase)，
 *     取自 git 暂存区 v5 着色器原文）逐字保留，验收⑤黑夜零回归以现版截图为基准；
 *   ② 球面分支 = v6 基础上只改三处：albedo 提亮 0.38→0.26（白昼保留纹理）、
 *     自发光两项替换为 v7.3 值（宽基底 1.05→0.30 且 ×uPhase²→×uPhase 线性升温，
 *     球体与光冕同步，消除"亮圈套暗盘"；峰形核心 1.45→0.85、指数 1.2→3.0 收拢过曝区）、
 *     菲涅尔保留 (1.0-0.75*uPhase) 因子；
 *   ③ 白昼天空架构（skyLin / skyVis / 分支内 tone()）：v6 已上线部分不动；
 *   ④ 光冕白昼系数 a1=mix(0.55,0.80,uPhase)、a2=mix(0.30,0.42,uPhase)（夜端不变）。
 * 数学结构仅按上述规则合并；uScale 为视直径尺寸参数（偏差⑦，规范已正式采纳）。
 * 夜间输出与现版逐位一致的推导：uPhase=0 时 a1=0.55/a2=0.30/第三项为 0（glow 与现版相同），
 * skyVis=0 → col=light·a³、alpha=a²；颗粒在统一尾部施加，与 a³ 为标量乘法可交换，
 * 结果与现版"先颗粒后 a³"完全相等。glow 的径向收尾 smoothstep(0.10,0.21,g) 属 v6 天空架构
 * （规则③保护项），夜间 g<0.10 处因子恒为 1、g≥0.10 处 a³ 抑制本已将贡献压至亚亮度级，实测无差。
 *
 * v8.2 光圈割裂修复（均为白昼分支，×uPhase 夜间为零不影响零回归）：
 *   ① 临边金边 fres^3·0.9 → fres^RIM_POW(5)·RIM_DAY(0.45)：宽亮金圈收细为贴临边的一线金边；
 *   ② 新增盘体整体暖化 DISC_WARM(0.55)：球心→临边连续暖金，白昼盘体不再洗白融入天空；
 *   ③ v8.1 径向暖化 0.5→0.3（保留临边沉金，不再单独聚圈）；
 *   ④ 内冕色相 (0.52,0.16)→(0.58,0.22)、glowLin 系数 1.8→1.55、CORONA_A1_DAY 0.8→0.65：
 *     临边内外金色浓度差收敛，内冕不再聚成独立亮环。
 *
 * v9 日出恒星化（均为白昼分支，×uPhase 夜间逐位不变，软件渲染零回归已验证）：
 *   ① 新增临边昏暗 limb darkening（LIMB_*）：真实恒星中心亮、临边沉为深金，
 *     盘体保留体积感，不再"洗白成白盘"（实测锚值：球心 #FBF3C7 → 0.5R #F8E9AD → 临边 #EFC063）；
 *   ② 临边亮环再收（RIM_DAY 0.45→0.08、色相偏深橙 (0.45,0.12)）：亮圈退出盘体，
 *     临边亮度改由球外内冕承担（CORONA_A1_DAY 0.65→0.90），光环在球外、柔软；
 *   ③ 自发光重塑：宽基底 0.30→0.16 且色温加深 (0.80,0.45)（饱和暖金不过曝）；
 *     核心 0.85→0.60 并拆为光照分量 + 径向小核（EMIT_CORE_RAD 0.45，ndv^10 收拢过曝区），
 *     白昼定格（无晨昏线）时仍有稳定的白炽小核；
 *   ④ 白昼宽晕：新增第三层指数衰减 HALO_WIDE + 加性晕径向收尾随 uPhase 延展
 *     （0.21R→0.85R，cosmos.network 式多层 halo），暖光化入奶油天空无断层。
 */

/** 着色器内可调字面量（v9 规范调参台参数；验收通过后锁定在此） */
const DAWN_GLSL_DEFAULTS = {
  EMIT_BASE: 0.16, // v9 宽基底系数（范围 0~0.8；0.30→0.16 防洗白）
  EMIT_CORE: 0.6, // v9 峰形核心系数（范围 0~2.0；0.85→0.60 收拢过曝）
  EMIT_CORE_POW: 3.0, // 核心收拢指数（范围 1~5）
  EMIT_CORE_RAD: 0.45, // v9 核心径向分量占比（范围 0~1；定格时稳定白炽小核）
  CORONA_A1_DAY: 0.9, // v9 白昼内冕（范围 0.4~1.3；0.65→0.90，临边亮环由球外大气承担）
  CORONA_A2_DAY: 0.44, // 白昼中冕（范围 0.2~0.8）
  RIM_DAY: 0.08, // v9 临边色边系数（范围 0~1.2；0.45→0.08，亮圈退出盘体）
  RIM_POW: 4.0, // v9 色边收细指数（范围 3~8）
  RIM_G: 0.45, // v9 色边色相 G（范围 0.2~0.8；深橙日出边）
  RIM_B: 0.12, // v9 色边色相 B（范围 0~0.5）
  DISC_WARM: 0.8, // v9 盘体整体暖化（范围 0~1；0.55→0.80 中球暖金更饱和）
  WARM_G: 0.88, // v9 盘体暖化色相 G（范围 0.7~1）
  WARM_B: 0.6, // v9 盘体暖化色相 B（范围 0.4~0.9）
  LIMB_DARK: 1.0, // v9 临边昏暗强度（范围 0~1.5；真实恒星 limb darkening）
  LIMB_POW: 2.2, // v9 昏暗收拢指数（范围 1~4，越大越贴临边）
  LIMB_G: 0.55, // v9 临边昏暗色相 G（范围 0.3~0.8；深金非棕）
  LIMB_B: 0.24, // v9 临边昏暗色相 B（范围 0.05~0.5）
  BASE_G: 0.8, // v9 宽基底色相 G（范围 0.5~1）
  BASE_B: 0.45, // v9 宽基底色相 B（范围 0.2~0.8）
  CORE_G: 0.9, // v9 核心色相 G（范围 0.7~1）
  CORE_B: 0.68, // v9 核心色相 B（范围 0.4~0.9）
  HALO_WIDE: 0.1, // v9 白昼宽晕第三层强度（范围 0~0.3）
  HALO_EXTEND: 1.0, // v9 白昼加性晕径向延展（范围 0~1.5；1 = 收尾 0.21R→0.85R）
}

/** 数值 → GLSL float 字面量（保证带小数点） */
function glslFloat(v) {
  let s = Number(v).toFixed(4).replace(/0+$/, '')
  if (s.endsWith('.')) s += '0'
  if (!s.includes('.')) s += '.0'
  return s
}

function buildFragSrc(p) {
  const EMIT_BASE = glslFloat(p.EMIT_BASE)
  const EMIT_CORE = glslFloat(p.EMIT_CORE)
  const EMIT_CORE_POW = glslFloat(p.EMIT_CORE_POW)
  const EMIT_CORE_RAD = glslFloat(p.EMIT_CORE_RAD)
  const CORONA_A1_DAY = glslFloat(p.CORONA_A1_DAY)
  const CORONA_A2_DAY = glslFloat(p.CORONA_A2_DAY)
  const RIM_DAY = glslFloat(p.RIM_DAY)
  const RIM_POW = glslFloat(p.RIM_POW)
  const RIM_G = glslFloat(p.RIM_G)
  const RIM_B = glslFloat(p.RIM_B)
  const DISC_WARM = glslFloat(p.DISC_WARM)
  const WARM_G = glslFloat(p.WARM_G)
  const WARM_B = glslFloat(p.WARM_B)
  const LIMB_DARK = glslFloat(p.LIMB_DARK)
  const LIMB_POW = glslFloat(p.LIMB_POW)
  const LIMB_G = glslFloat(p.LIMB_G)
  const LIMB_B = glslFloat(p.LIMB_B)
  const BASE_G = glslFloat(p.BASE_G)
  const BASE_B = glslFloat(p.BASE_B)
  const CORE_G = glslFloat(p.CORE_G)
  const CORE_B = glslFloat(p.CORE_B)
  const HALO_WIDE = glslFloat(p.HALO_WIDE)
  const HALO_EXTEND = glslFloat(p.HALO_EXTEND)
  return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uTime; uniform float uPhase; uniform float uBright;
uniform float uScale;

float hash21(vec2 p){ p=fract(p*vec2(234.34,435.345)); p+=dot(p,p+34.23); return fract(p.x*p.y); }
float hash31(vec3 p){ p=fract(p*0.3183099+vec3(0.1,0.17,0.13)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise3(vec3 x){
  vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  float n000=hash31(i), n100=hash31(i+vec3(1.,0.,0.)), n010=hash31(i+vec3(0.,1.,0.)), n110=hash31(i+vec3(1.,1.,0.));
  float n001=hash31(i+vec3(0.,0.,1.)), n101=hash31(i+vec3(1.,0.,1.)), n011=hash31(i+vec3(0.,1.,1.)), n111=hash31(i+vec3(1.,1.,1.));
  return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y),f.z);
}
float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*noise3(p); p=p*2.03+vec3(1.7,9.2,4.1); a*=0.5; } return s; }
vec3 tone(vec3 c){ return pow(1.0 - exp(-c*1.6), vec3(0.92)); }   // filmic 色调映射

void main(){
  vec2 uv = ((gl_FragCoord.xy*2.0 - uRes) / uRes.y) / uScale;   // uScale：视直径尺寸参数
  float az = mix(-0.5, 0.35, uPhase);
  vec3 L = normalize(vec3(sin(az), 0.28, cos(az)));
  float rot = uPhase * 3.14159265;
  vec3 ro = vec3(0.0, 0.0, 3.1);
  vec3 rd = normalize(vec3(uv*0.92, -1.55));
  float b = dot(ro, rd);
  float cc = dot(ro, ro) - 1.0;
  float h = b*b - cc;
  float sunAmt = 0.32 + 0.62*uPhase;
  vec3 col = vec3(0.0); float alpha = 0.0; float doTone = 1.0;
  if (h > 0.0) {
    float th = -b - sqrt(h);
    vec3 p = ro + rd*th;
    vec3 n = normalize(p);
    float dl = dot(n, L);
    vec3 nt = vec3(n.x*cos(rot)+n.z*sin(rot), n.y, -n.x*sin(rot)+n.z*cos(rot));
    float surf = fbm(nt*2.4 + vec3(7.3, 2.9, 5.1));
    float detail = fbm(nt*6.0 + vec3(1.0));
    float mottle = smoothstep(0.35, 0.75, surf + detail*0.25);
    vec3 alb = mix(vec3(0.56,0.38,0.135), vec3(0.84,0.60,0.27), mottle);
    alb *= 1.0 - mix(0.18, 0.06, uPhase)*smoothstep(0.55, 0.80, fbm(nt*1.6 + vec3(11.0)));
    alb = mix(alb, vec3(1.0,0.82,0.48), uPhase*0.26);   // v7.3:albedo 提亮 0.38→0.26(白昼保留纹理)
    float lit = mix(0.50, 0.76, uPhase) + 0.60*max(dl, 0.0);
    vec3 sc = alb * lit * vec3(1.0, 0.94, 0.82);
    vec3 hv = normalize(L - rd);
    sc += vec3(1.0,0.95,0.85) * pow(max(dot(n,hv), 0.0), 26.0) * 0.48;
    sc += vec3(0.35,0.18,0.05) * smoothstep(-0.25,0.15,dl) * (1.0-smoothstep(0.15,0.6,dl)) * 0.4;
    sc *= uBright;
    float fres = pow(1.0 - max(dot(n,-rd), 0.0), 3.0);
    sc += vec3(1.0,0.72,0.34) * fres * (0.35 + 0.65*uPhase) * (1.0 - 0.75*uPhase) * (0.4 + 0.6*smoothstep(-0.5,0.6,dl)) * uBright;
    // v9 临边色边:仅留一线深橙日出边(0.45→0.08),亮环退出盘体、由球外内冕承担
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), ${RIM_POW});
    sc += vec3(1.0, ${RIM_G}, ${RIM_B}) * rim * uPhase * ${RIM_DAY} * uBright;
    // v9 临边昏暗(limb darkening):真实恒星中心亮、临边沉为深金,盘体保留体积感不洗白
    sc *= mix(vec3(1.0), vec3(1.0, ${LIMB_G}, ${LIMB_B}), pow(1.0 - max(dot(n, -rd), 0.0), ${LIMB_POW}) * uPhase * ${LIMB_DARK});
    // v9 盘体整体暖化(色相加深 (0.88,0.60)):中球暖金更饱和,不再是奶油白
    sc *= mix(vec3(1.0), vec3(1.05, ${WARM_G}, ${WARM_B}), uPhase * ${DISC_WARM});
    // v8.1 径向暖化保留但减弱(0.5→0.3):临边沉金仍在,只是不再单独聚成一圈
    sc *= mix(vec3(1.0), vec3(1.07, 0.93, 0.70), fres * uPhase * 0.3);
    // v9 自发光:宽基底 0.30→0.16 且色温加深(饱和暖金不过曝);
    // 核心拆为光照分量 + 径向小核(EMIT_CORE_RAD,ndv^10 收拢)——定格无晨昏线时仍有稳定白炽小核
    sc += vec3(1.0, ${BASE_G}, ${BASE_B}) * uPhase * (0.45 + 0.75*max(dl, 0.0)) * ${EMIT_BASE} * uBright;
    float coreTerm = pow(max(dl, 0.0), ${EMIT_CORE_POW}) * (1.0 - ${EMIT_CORE_RAD})
                   + pow(max(dot(n, -rd), 0.0), 10.0) * ${EMIT_CORE_RAD};
    sc += vec3(1.0, ${CORE_G}, ${CORE_B}) * uPhase*uPhase * coreTerm * ${EMIT_CORE} * uBright;
    col = sc; alpha = 1.0;
  } else {
    float closest = sqrt(max(dot(ro,ro) - b*b, 0.0));
    float g = max(closest - 1.0, 0.0);
    float a1 = mix(0.55, ${CORONA_A1_DAY}, uPhase);   // v7.3 规则④:光冕白昼系数(夜端 0.55/0.30 不变)
    float a2 = mix(0.30, ${CORONA_A2_DAY}, uPhase);
    float glow = (exp(-g*9.0)*a1 + exp(-g*3.2)*a2 + exp(-g*2.0)*0.11*uPhase) * sunAmt * uBright * (1.0+0.65*uPhase);
    // v9 白昼宽晕:第三层指数衰减(cosmos 式多层 halo)+加性晕径向收尾随 uPhase 延展
    // (0.21R→0.85R;uPhase=0 时收尾边界逐位等于 0.10/0.21,夜间零回归)
    glow += exp(-g*1.5) * ${HALO_WIDE} * uPhase * sunAmt * uBright;
    glow *= 1.0 - smoothstep(mix(0.10, 0.18, uPhase * ${HALO_EXTEND}), mix(0.21, 0.85, uPhase * ${HALO_EXTEND}), g);
    // 夜间光晕:线上现版逐字保留(规则①;临边抑制 light·a³ / alpha a²(1-uPhase),验收⑤零回归基准)
    vec3 light = vec3(1.0, 0.66, 0.30) * glow;
    light = 1.0 - exp(-light*1.6);
    light = pow(light, vec3(0.92));
    float a = clamp(glow*1.25, 0.0, 0.98);
    vec3 nightCol = light * a * a * a;
    float nightAlpha = a * a * (1.0 - uPhase);
    // 白昼天空:v6 架构不动(线性空间,远端精确落回 #F7F3EC;以球心为源径向辐照)
    // v8 启明色彩(用户取样卡):光冕色相按半径渐变(临边炽金 #E8A33D 方向 → 外缘奶油 #F1D9BC),
    // 取代单一加白;临边金带用乘法压蓝成形(日出地平线),避免"白圈无过渡"
    // v8.1:近冕色相加深 (0.60,0.22)→(0.52,0.16)(海面日出 #F6BC71 的线性近似),
    // 加性系数 2.4→1.8(乘法金带主承担色彩,加法只提亮,杜绝洗白);金带加宽加深
    // v8.2:内冕色相微回 (0.52,0.16)→(0.58,0.22)、系数 1.8→1.55——
    // 配合盘体暖化,临边内外的金色浓度差收敛,光圈不再与盘体割裂
    vec3 glowHue = mix(vec3(1.0, 0.58, 0.22), vec3(1.0, 0.84, 0.58), smoothstep(0.02, 0.16, g));
    vec3 glowLin = glowHue * glow * 0.55;
    vec3 skyLin = vec3(2.11, 1.86, 1.57);
    skyLin *= mix(vec3(1.0), vec3(1.26, 1.02, 0.70), uPhase * exp(-g*2.0));   // 金色光池(暖加深、蓝下压)
    float band = exp(-g*5.5) * uPhase * (0.65 + 0.35*uBright);                 // 临边金带:绽放时同步加深
    skyLin *= mix(vec3(1.0), vec3(1.12, 0.84, 0.36), band);
    // v8.1 日出方向性:天光朝光源方位(右上)微暖,模拟"天未全亮、日已升起"的方向感;随 g 衰减,远端无缝
    vec2 sunDir2 = normalize(vec2(0.62, 0.45));
    float dirW = 0.5 + 0.5 * dot(normalize(uv + vec2(1e-4, 1e-4)), sunDir2);
    skyLin *= mix(vec3(1.0), vec3(1.09, 0.99, 0.84), uPhase * exp(-g*1.5) * 0.4 * dirW);
    // v9.1 天空竖向晨曦梯度:近球上空微冷(奶油 #E6E0DC 方向)、低处微暖(海面日出 #F1D9BC 方向),
    // 随 g 衰减,远端精确回落 #F7F3EC,不破晓画布边缘无缝
    float vgrad = smoothstep(-1.2, 1.2, -uv.y);
    skyLin *= mix(vec3(1.0), mix(vec3(0.965, 0.985, 1.045), vec3(1.075, 1.0, 0.85), vgrad), uPhase * exp(-g*1.2) * 0.55);
    float skyVis = smoothstep(0.88, 1.00, uPhase);
    col = mix(nightCol, tone(skyLin + glowLin*1.55), skyVis);
    alpha = mix(nightAlpha, 1.0, skyVis);
    doTone = 0.0;
  }
  if (doTone > 0.5) { col = tone(col); }                // 球体分支在此映射;天空/夜晕分支已各自映射
  col *= 0.94 + 0.12*hash21(gl_FragCoord.xy*0.71 + fract(uTime)*13.0);
  gl_FragColor = vec4(col, alpha);
}
`
}

/** 相机尺寸参数：着色器原始几何下星球 uv 半径 ≈ 0.5742；画布边长 = 3 × 星球直径
 *  → 球直径需占画布 1/3：rs × uScale = 1/3 → uScale = 1/(3 × 0.5742) */
const PLANET_VIEW_SCALE = 1 / (0.5742 * 3)

function compileShader(gl, type, src) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`[planetDawnGL] 着色器编译失败: ${log}`)
  }
  return shader
}

/**
 * 在给定 canvas 上创建 WebGL 星球渲染器。
 * @returns {{ render(time:number, phase:number, bright:number):void,
 *             resize(sizePx:number, dpr:number):void,
 *             recompile(params:object):number, destroy():void }}
 */
export function createPlanetGL(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    // 预乘管线（premultipliedAlpha:true + ONE/ONE_MINUS_SRC_ALPHA，规范确认不变）：
    // 夜间为现版双重衰减贡献（light·a³, alpha a²），白昼天空随 skyVis 渐为不透明（alpha→1）
    premultipliedAlpha: true,
    antialias: false,
  })
  if (!gl) {
    throw new Error('[planetDawnGL] WebGL 上下文创建失败（getContext("webgl") 返回 null）')
  }

  // 全屏四边形（星球与光晕在片元着色器内解析求交，背景透明）；attribute 固定到 location 0，
  // 使重编译 program 后无需重绑顶点指针
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

  let prog = null
  let loc = {}
  function buildProgram(fragSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
    const p = gl.createProgram()
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.bindAttribLocation(p, 0, 'aP')
    gl.linkProgram(p)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p)
      gl.deleteProgram(p)
      throw new Error(`[planetDawnGL] 着色器链接失败: ${log}`)
    }
    return p
  }
  function useProgram(p) {
    prog = p
    gl.useProgram(prog)
    loc = {
      uRes: gl.getUniformLocation(prog, 'uRes'),
      uTime: gl.getUniformLocation(prog, 'uTime'),
      uPhase: gl.getUniformLocation(prog, 'uPhase'),
      uBright: gl.getUniformLocation(prog, 'uBright'),
      uScale: gl.getUniformLocation(prog, 'uScale'),
    }
    gl.uniform1f(loc.uScale, PLANET_VIEW_SCALE)
  }
  useProgram(buildProgram(buildFragSrc(DAWN_GLSL_DEFAULTS)))

  return {
    /** devicePixelRatio 上限 2；sizePx 为画布 CSS 边长（正方形） */
    resize(sizePx, dpr) {
      const s = Math.max(2, Math.floor(sizePx * Math.min(dpr || 1, 2)))
      if (canvas.width !== s || canvas.height !== s) {
        canvas.width = s
        canvas.height = s
      }
    },
    render(time, phase, bright) {
      if (canvas.width < 2) return
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(loc.uRes, canvas.width, canvas.height)
      gl.uniform1f(loc.uTime, time)
      gl.uniform1f(loc.uPhase, phase)
      gl.uniform1f(loc.uBright, bright)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    /** 调参台：替换着色器字面量并重编译 program（返回耗时 ms，规范要求 <100ms） */
    recompile(params) {
      const t0 = performance.now()
      const p = buildProgram(buildFragSrc({ ...DAWN_GLSL_DEFAULTS, ...(params || {}) }))
      gl.deleteProgram(prog)
      useProgram(p)
      return performance.now() - t0
    },
    destroy() {
      if (prog) gl.deleteProgram(prog)
      const ext = gl.getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()
    },
  }
}

/* ————————————————————————————————————————————————————————————
 * 破晓调参台（v7.3 规范第三节，开发期一次性投入）
 * 仅 URL 带 ?dawnlab=1 时挂载（正式用户不可见；无参数时零 DOM 注入）。
 * 滑杆实时驱动：着色器参数 → 替换字面量重编译 program（<100ms，不做 uniform 化）；
 * BRIGHT_REST/BRIGHT_PEAK 作用于预览帧（锁定后由人同步进时间线字面量）。
 * ———————————————————————————————————————————————————————————— */
const DAWN_LAB_PARAMS = [
  { key: 'EMIT_BASE', label: 'EMIT_BASE 宽基底', min: 0, max: 0.8, step: 0.01, def: 0.16, shader: true },
  { key: 'EMIT_CORE', label: 'EMIT_CORE 峰形核心', min: 0, max: 2.0, step: 0.01, def: 0.6, shader: true },
  { key: 'EMIT_CORE_POW', label: 'EMIT_CORE_POW 核心指数', min: 1, max: 5, step: 0.1, def: 3.0, shader: true },
  { key: 'EMIT_CORE_RAD', label: 'EMIT_CORE_RAD 径向核占比', min: 0, max: 1, step: 0.01, def: 0.45, shader: true },
  { key: 'CORONA_A1_DAY', label: 'CORONA_A1_DAY 白昼内冕', min: 0.4, max: 1.3, step: 0.01, def: 0.9, shader: true },
  { key: 'CORONA_A2_DAY', label: 'CORONA_A2_DAY 白昼中冕', min: 0.2, max: 0.8, step: 0.01, def: 0.44, shader: true },
  { key: 'RIM_DAY', label: 'RIM_DAY 临边色边', min: 0, max: 1.2, step: 0.01, def: 0.08, shader: true },
  { key: 'RIM_POW', label: 'RIM_POW 色边收细', min: 3, max: 8, step: 0.1, def: 4.0, shader: true },
  { key: 'DISC_WARM', label: 'DISC_WARM 盘体暖化', min: 0, max: 1, step: 0.01, def: 0.8, shader: true },
  { key: 'LIMB_DARK', label: 'LIMB_DARK 临边昏暗', min: 0, max: 1.5, step: 0.01, def: 1.0, shader: true },
  { key: 'LIMB_POW', label: 'LIMB_POW 昏暗收拢', min: 1, max: 4, step: 0.1, def: 2.2, shader: true },
  { key: 'HALO_WIDE', label: 'HALO_WIDE 白昼宽晕', min: 0, max: 0.3, step: 0.005, def: 0.1, shader: true },
  { key: 'HALO_EXTEND', label: 'HALO_EXTEND 晕径向延展', min: 0, max: 1.5, step: 0.01, def: 1.0, shader: true },
  { key: 'BRIGHT_REST', label: 'BRIGHT_REST 定格亮度', min: 0.9, max: 1.6, step: 0.01, def: 1.25, shader: false },
  { key: 'BRIGHT_PEAK', label: 'BRIGHT_PEAK 绽放峰值', min: 1.1, max: 2.0, step: 0.01, def: 1.5, shader: false },
]

/**
 * 挂载调参台。仅 ?dawnlab=1 时生效，返回是否已挂载。
 * @param renderer createPlanetGL 返回值
 * @param hooks { setPreview(frame: {phase:number, bright:number} | null):void } 预览帧注入/释放
 */
export function installDawnLab(renderer, hooks) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  const q = new URLSearchParams(window.location.search)
  const flag = q.get('dawnlab')
  if (flag !== '1' && flag !== 'true') return false

  const params = {}
  DAWN_LAB_PARAMS.forEach((d) => {
    params[d.key] = d.def
  })
  let preset = null // 'rest' | 'mid' | 'bloom' | null

  const shaderParams = () => {
    const o = {}
    DAWN_LAB_PARAMS.forEach((d) => {
      if (d.shader) o[d.key] = params[d.key]
    })
    return o
  }
  const applyPreview = () => {
    if (!hooks || !hooks.setPreview) return
    if (preset === 'rest') hooks.setPreview({ phase: 1, bright: params.BRIGHT_REST })
    else if (preset === 'mid') hooks.setPreview({ phase: 0.55, bright: 1.15 })
    else if (preset === 'bloom') hooks.setPreview({ phase: 1, bright: params.BRIGHT_PEAK })
    else hooks.setPreview(null)
  }

  const root = document.createElement('div')
  root.id = 'dawn-lab'
  root.style.cssText =
    'position:fixed;right:16px;bottom:16px;z-index:99999;width:292px;max-height:72vh;overflow:auto;' +
    'background:rgba(22,17,11,0.94);color:#f3e7cf;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;' +
    'padding:12px 14px;border-radius:12px;border:1px solid rgba(232,163,61,0.35);' +
    'box-shadow:0 8px 28px rgba(0,0,0,0.45);pointer-events:auto;user-select:none;'

  const title = document.createElement('div')
  title.textContent = '破晓调参台 v9（仅 ?dawnlab=1 可见）'
  title.style.cssText = 'font-weight:700;color:#e8a33d;margin-bottom:8px;'
  root.appendChild(title)

  DAWN_LAB_PARAMS.forEach((d) => {
    const row = document.createElement('div')
    row.style.cssText = 'margin:6px 0;'
    const head = document.createElement('div')
    head.style.cssText = 'display:flex;justify-content:space-between;'
    const name = document.createElement('span')
    name.textContent = d.label
    const val = document.createElement('span')
    val.style.cssText = 'color:#e8a33d;'
    val.textContent = Number(d.def).toFixed(2)
    head.appendChild(name)
    head.appendChild(val)
    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(d.min)
    input.max = String(d.max)
    input.step = String(d.step)
    input.value = String(d.def)
    input.style.cssText = 'width:100%;accent-color:#e8a33d;'
    input.addEventListener('input', () => {
      params[d.key] = Number(input.value)
      val.textContent = Number(input.value).toFixed(2)
      if (d.shader) {
        const ms = renderer.recompile(shaderParams())
        if (ms > 100) console.warn(`[dawn-lab] 重编译耗时 ${ms.toFixed(1)}ms，超出规范 100ms 预算`)
      }
      applyPreview()
    })
    row.appendChild(head)
    row.appendChild(input)
    root.appendChild(row)
  })

  const btnRow = document.createElement('div')
  btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;'
  const mkBtn = (text, onClick) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = text
    b.style.cssText =
      'flex:1 1 auto;padding:4px 8px;font:inherit;color:#f3e7cf;background:rgba(232,163,61,0.16);' +
      'border:1px solid rgba(232,163,61,0.45);border-radius:7px;cursor:pointer;'
    b.addEventListener('click', onClick)
    btnRow.appendChild(b)
    return b
  }
  mkBtn('定格 uPhase=1', () => {
    preset = 'rest'
    applyPreview()
  })
  mkBtn('中点 uPhase=0.55', () => {
    preset = 'mid'
    applyPreview()
  })
  mkBtn('绽放 uPhase=1', () => {
    preset = 'bloom'
    applyPreview()
  })
  mkBtn('释放预览', () => {
    preset = null
    applyPreview()
  })
  root.appendChild(btnRow)

  const exportBtn = mkBtn('导出参数 JSON', () => {
    const json = JSON.stringify(params, null, 2)
    const done = () => {
      exportBtn.textContent = '已复制 ✓'
      setTimeout(() => {
        exportBtn.textContent = '导出参数 JSON'
      }, 1200)
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(done, () => {
        window.prompt('复制以下参数 JSON：', json)
        done()
      })
    } else {
      window.prompt('复制以下参数 JSON：', json)
      done()
    }
  })
  exportBtn.style.marginTop = '8px'
  exportBtn.style.width = '100%'
  root.appendChild(exportBtn)

  document.body.appendChild(root)
  return true
}
