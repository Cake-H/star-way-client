<template>
  <div class="resume-draft" :class="{ 'is-view-only': viewOnly }">
    <el-alert
      v-if="!viewOnly"
      class="top-tip"
      type="info"
      show-icon
      :closable="false"
      title="智能解析仅为草稿，可能与原件存在偏差"
      :description="
        isMobile
          ? '带「建议核对」的字段请务必人工检查。保存前须填：简历名称、姓名、手机号、邮箱。'
          : '标有「建议核对」的字段请务必人工检查；带下拉选项的字段优先选择，减少手输错误。正式投递前请再次确认联系方式与经历时间线。保存到云端前还须填写：顶部「简历名称」、本表中的姓名、手机号、邮箱。'
      "
    />
    <el-alert
      v-else
      class="top-tip"
      type="info"
      show-icon
      :closable="false"
      title="只读浏览"
      :description="
        isMobile
          ? '仅供查看，修改请点上方「编辑」。'
          : '以下为已保存的完整结构化简历内容，仅供查看。如需修改请使用页面上方「编辑」按钮。'
      "
    />

    <el-form
      :model="draft"
      label-position="top"
      class="resume-draft-form"
      require-asterisk-position="right"
      :disabled="viewOnly"
    >
      <el-collapse v-model="nav.activePanels.value" class="section-collapse">
            <!-- 基本信息 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'basic')"
              title="基本信息"
              name="basic"
              data-section="basic"
            >
              <p v-if="!viewOnly" class="section-hint">保存时，<strong>姓名</strong>为必填项。</p>
              <el-row :gutter="20">
                <el-col :xs="24" :md="12">
                  <el-form-item label="简历标题">
                    <el-input v-model="draft.title" placeholder="如：张三_前端工程师" clearable />
                    <p class="hint">用于列表展示，可与职位意向呼应。</p>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="姓名" :required="!viewOnly">
                    <el-input v-model="draft.fullName" placeholder="与证件一致" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="性别">
                    <el-select v-model="draft.gender" clearable placeholder="请选择" style="width: 100%">
                      <el-option
                        v-for="o in GENDER_OPTIONS"
                        :key="String(o.value)"
                        :label="o.label"
                        :value="o.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="出生日期">
                    <el-date-picker
                      v-model="draft.birthDate"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="选择日期"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="民族">
                    <el-select v-model="draft.ethnicity" filterable allow-create placeholder="选择或填写" style="width: 100%">
                      <el-option v-for="o in ETHNICITY_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="证件类型">
                    <el-select v-model="draft.idDocType" placeholder="请选择" style="width: 100%">
                      <el-option v-for="o in ID_DOC_TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="证件号码">
                    <el-input v-model="draft.idDocNumber" placeholder="注意脱敏与隐私安全" clearable />
                    <p class="hint warn">建议核对：号码与证件类型需一致。</p>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-collapse-item>

            <!-- 联系方式 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'contact')"
              title="联系方式与紧急联系人"
              name="contact"
              data-section="contact"
            >
              <p v-if="!viewOnly" class="section-hint">保存时，<strong>手机号</strong>与<strong>邮箱</strong>为必填项。</p>
              <el-row :gutter="20">
                <el-col :xs="24" :md="12">
                  <el-form-item label="手机号" :required="!viewOnly">
                    <el-input v-model="draft.phone" maxlength="11" placeholder="11 位，1 开头" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="邮箱" :required="!viewOnly">
                    <el-input v-model="draft.email" placeholder="用于通知与投递" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="QQ">
                    <el-input v-model="draft.qq" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="微信">
                    <el-input v-model="draft.wechat" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="紧急联系人">
                    <el-input v-model="draft.emergencyContactName" placeholder="姓名" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="紧急联系电话">
                    <el-input v-model="draft.emergencyContactPhone" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="与本人关系">
                    <el-input v-model="draft.emergencyContactRelation" placeholder="如：父母/配偶" clearable />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-collapse-item>

            <!-- 籍贯与地址 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'addr')"
              title="籍贯与现居"
              name="addr"
              data-section="addr"
            >
              <el-row :gutter="20">
                <el-col :xs="12" :md="8">
                  <el-form-item label="国家/地区">
                    <el-input v-model="draft.countryRegion" placeholder="如：中国" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="籍贯">
                    <el-input v-model="draft.nativePlace" placeholder="省市区或简要填写" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="政治面貌">
                    <el-select v-model="draft.politicalStatus" placeholder="请选择" style="width: 100%">
                      <el-option
                        v-for="o in POLITICAL_STATUS_OPTIONS"
                        :key="o.value"
                        :label="o.label"
                        :value="o.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="户口性质">
                    <el-select v-model="draft.hukouType" placeholder="请选择" style="width: 100%">
                      <el-option v-for="o in HUKOU_TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="省">
                    <el-input v-model="draft.province" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="8">
                  <el-form-item label="市">
                    <el-input v-model="draft.city" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="区/县">
                    <el-input v-model="draft.district" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="现居城市">
                    <el-input v-model="draft.currentCity" placeholder="工作/生活城市" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="详细地址">
                    <el-input v-model="draft.detailAddress" type="textarea" :rows="2" placeholder="街道门牌等" />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="通讯地址同现居">
                    <el-select v-model="draft.mailingSameAsCurrent" clearable placeholder="请选择" style="width: 100%">
                      <el-option
                        v-for="o in YES_NO_UNKNOWN"
                        :key="String(o.value)"
                        :label="o.label"
                        :value="o.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="通讯地址">
                    <el-input v-model="draft.mailingAddress" type="textarea" :rows="2" placeholder="若与现居不同请填写" />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-collapse-item>

            <!-- 求职意向 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'job')"
              title="求职意向与自我介绍"
              name="job"
              data-section="job"
            >
              <el-row :gutter="20">
                <el-col :xs="12" :md="12">
                  <el-form-item label="求职状态">
                    <el-select v-model="draft.jobSeekingStatus" clearable placeholder="请选择" style="width: 100%">
                      <el-option
                        v-for="o in JOB_SEEKING_STATUS_OPTIONS"
                        :key="String(o.value)"
                        :label="o.label"
                        :value="o.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="是否应届">
                    <el-select v-model="draft.isFreshGraduate" clearable placeholder="请选择" style="width: 100%">
                      <el-option
                        v-for="o in YES_NO_UNKNOWN"
                        :key="String(o.value)"
                        :label="o.label"
                        :value="o.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="工作年限（文本）">
                    <el-input v-model="draft.workYears" placeholder="如：3 年 / 应届" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="可到岗时间">
                    <el-input v-model="draft.availability" placeholder="如：随时 / 一个月内" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="期望职位">
                    <el-input v-model="draft.expectedPositions" type="textarea" :rows="2" placeholder="多个用顿号或换行分隔" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="期望城市">
                    <el-input v-model="draft.expectedCities" type="textarea" :rows="2" placeholder="多个城市请分行或顿号" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="期望行业">
                    <el-input v-model="draft.expectedIndustries" type="textarea" :rows="2" />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="薪资期望">
                    <el-input v-model="draft.salaryExpectation" placeholder="如：20-30K·月" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="12" :md="12">
                  <el-form-item label="是否接受调动">
                    <el-select v-model="draft.acceptTransfer" clearable placeholder="请选择" style="width: 100%">
                      <el-option
                        v-for="o in YES_NO_UNKNOWN"
                        :key="String(o.value)"
                        :label="o.label"
                        :value="o.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="24">
                  <el-form-item label="自我评价">
                    <el-input v-model="draft.selfIntro" type="textarea" :rows="4" placeholder="简明扼要，突出岗位匹配度" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="24">
                  <el-form-item label="核心优势">
                    <el-input v-model="draft.strengths" type="textarea" :rows="3" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="24">
                  <el-form-item label="作品/链接">
                    <el-input
                      v-model="draft.portfolioLinks"
                      type="textarea"
                      :rows="3"
                      placeholder="合法 JSON（对象/数组）可直接填写；纯文本、Markdown、多行 URL 亦可，保存时将自动包成 JSON 数组以兼容数据库"
                    />
                    <p class="hint">若留空则不写入该字段。</p>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-collapse-item>

            <!-- 教育 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'edu')"
              title="教育经历"
              name="edu"
              data-section="edu"
            >
              <p class="section-hint">从最高学历开始填写；支持多条。日期格式建议 YYYY-MM-DD。</p>
              <div v-for="(row, i) in draft.educations" :key="'edu-' + i" class="block">
                <div class="block-head">
                  <span>教育经历 {{ i + 1 }}</span>
                  <el-button v-if="!viewOnly" link type="danger" @click="removeLine(draft.educations, i)">删除</el-button>
                </div>
                <el-row :gutter="18">
                  <el-col :xs="24" :md="12">
                    <el-form-item label="学校">
                      <el-input v-model="row.schoolName" placeholder="学校全称" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="学院">
                      <el-input v-model="row.collegeName" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="专业">
                      <el-input v-model="row.major" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="6">
                    <el-form-item label="学历">
                      <el-select v-model="row.degree" placeholder="请选择" style="width: 100%">
                        <el-option v-for="o in DEGREE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="6">
                    <el-form-item label="学位">
                      <el-select v-model="row.academicDegree" placeholder="请选择" style="width: 100%">
                        <el-option v-for="o in ACADEMIC_DEGREE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="8">
                    <el-form-item label="是否全日制">
                      <el-select v-model="row.isFullTime" clearable placeholder="请选择" style="width: 100%">
                        <el-option
                          v-for="o in YES_NO_UNKNOWN"
                          :key="String(o.value)"
                          :label="o.label"
                          :value="o.value"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="8">
                    <el-form-item label="入学">
                      <el-date-picker v-model="row.enrollDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="8">
                    <el-form-item label="毕业">
                      <el-date-picker v-model="row.graduateDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="8">
                    <el-form-item label="国家/地区">
                      <el-input v-model="row.countryRegion" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="8">
                    <el-form-item label="GPA">
                      <el-input v-model="row.gpa" placeholder="如：3.6/4.0" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="8">
                    <el-form-item label="排名/荣誉简述">
                      <el-input v-model="row.rankingDesc" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="主修课程">
                      <el-input v-model="row.majorCourses" type="textarea" :rows="2" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="校内职务">
                      <el-input v-model="row.studentPosition" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="在校荣誉">
                      <el-input v-model="row.honors" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="补充说明">
                      <el-input v-model="row.description" type="textarea" :rows="2" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              <el-button v-if="!viewOnly" type="primary" plain @click="draft.educations.push(emptyEducationLine())">添加教育经历</el-button>
            </el-collapse-item>

            <!-- 工作 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'work')"
              title="工作经历"
              name="work"
              data-section="work"
            >
              <p class="section-hint">时间线请勿重叠；结束时间为空可表示至今。</p>
              <div v-for="(row, i) in draft.works" :key="'w-' + i" class="block">
                <div class="block-head">
                  <span>工作经历 {{ i + 1 }}</span>
                  <el-button v-if="!viewOnly" link type="danger" @click="removeLine(draft.works, i)">删除</el-button>
                </div>
                <el-row :gutter="18">
                  <el-col :xs="24" :md="12">
                    <el-form-item label="公司">
                      <el-input v-model="row.companyName" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="部门">
                      <el-input v-model="row.department" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="职位">
                      <el-input v-model="row.jobTitle" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="工作城市">
                      <el-input v-model="row.workCity" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="行业">
                      <el-input v-model="row.companyIndustry" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="用工性质">
                      <el-select v-model="row.employmentNature" placeholder="请选择" style="width: 100%">
                        <el-option v-for="o in EMPLOYMENT_NATURE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="开始">
                      <el-date-picker v-model="row.startDate" type="month" value-format="YYYY-MM" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="结束">
                      <el-date-picker v-model="row.endDate" type="month" value-format="YYYY-MM" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="工作内容">
                      <el-input v-model="row.workDescription" type="textarea" :rows="4" placeholder="职责与业绩，STAR 描述更佳" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="离职原因">
                      <el-input v-model="row.leaveReason" type="textarea" :rows="2" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              <el-button v-if="!viewOnly" type="primary" plain @click="draft.works.push(emptyWorkLine())">添加工作经历</el-button>
            </el-collapse-item>

            <!-- 项目 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'proj')"
              title="项目经历"
              name="proj"
              data-section="proj"
            >
              <div v-for="(row, i) in draft.projects" :key="'p-' + i" class="block">
                <div class="block-head">
                  <span>项目 {{ i + 1 }}</span>
                  <el-button v-if="!viewOnly" link type="danger" @click="removeLine(draft.projects, i)">删除</el-button>
                </div>
                <el-row :gutter="18">
                  <el-col :xs="24" :md="12">
                    <el-form-item label="项目名称">
                      <el-input v-model="row.projectName" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="角色">
                      <el-input v-model="row.roleName" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="组织/公司">
                      <el-input v-model="row.companyOrOrg" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="链接">
                      <el-input v-model="row.projectUrl" placeholder="Demo / GitHub" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="开始">
                      <el-date-picker v-model="row.startDate" type="month" value-format="YYYY-MM" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="结束">
                      <el-date-picker v-model="row.endDate" type="month" value-format="YYYY-MM" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="技术关键词">
                      <el-input v-model="row.techKeywords" placeholder="如：Vue3 / Spring Boot / K8s" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="职责">
                      <el-input v-model="row.dutyDescription" type="textarea" :rows="5" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="成果">
                      <el-input v-model="row.achievement" type="textarea" :rows="4" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="补充">
                      <el-input v-model="row.description" type="textarea" :rows="4" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              <el-button v-if="!viewOnly" type="primary" plain @click="draft.projects.push(emptyProjectLine())">添加项目</el-button>
            </el-collapse-item>

            <!-- 校园 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'campus')"
              title="校园经历 / 社团活动"
              name="campus"
              data-section="campus"
            >
              <div v-for="(row, i) in draft.campusExperiences" :key="'c-' + i" class="block">
                <div class="block-head">
                  <span>校园经历 {{ i + 1 }}</span>
                  <el-button v-if="!viewOnly" link type="danger" @click="removeLine(draft.campusExperiences, i)">删除</el-button>
                </div>
                <el-row :gutter="18">
                  <el-col :xs="24" :md="12">
                    <el-form-item label="组织">
                      <el-input v-model="row.organizationName" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="职务">
                      <el-input v-model="row.roleTitle" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="开始">
                      <el-date-picker v-model="row.startDate" type="month" value-format="YYYY-MM" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="结束">
                      <el-date-picker v-model="row.endDate" type="month" value-format="YYYY-MM" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="描述">
                      <el-input v-model="row.description" type="textarea" :rows="3" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              <el-button v-if="!viewOnly" type="primary" plain @click="draft.campusExperiences.push(emptyCampusLine())">添加校园经历</el-button>
            </el-collapse-item>

            <!-- 技能 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'skill')"
              title="技能"
              name="skill"
              data-section="skill"
            >
              <div v-for="(row, i) in draft.skills" :key="'s-' + i" class="block">
                <div class="block-head">
                  <span>技能 {{ i + 1 }}</span>
                  <el-button v-if="!viewOnly" link type="danger" @click="removeLine(draft.skills, i)">删除</el-button>
                </div>
                <el-row :gutter="18">
                  <el-col :xs="12" :md="8">
                    <el-form-item label="类别">
                      <el-input v-model="row.skillCategory" placeholder="如：前端 / 语言" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="8">
                    <el-form-item label="技能名">
                      <el-input v-model="row.skillName" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="8">
                    <el-form-item label="熟练度">
                      <el-input v-model="row.proficiency" placeholder="如：熟练 / 精通" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="8">
                    <el-form-item label="使用时长（月）">
                      <el-input-number
                        v-model="row.monthsOfUse"
                        :min="0"
                        :max="600"
                        :controls-position="isMobile ? undefined : 'right'"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              <el-button v-if="!viewOnly" type="primary" plain @click="draft.skills.push(emptySkillLine())">添加技能</el-button>
            </el-collapse-item>

            <!-- 语言 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'lang')"
              title="语言能力"
              name="lang"
              data-section="lang"
            >
              <div v-for="(row, i) in draft.languages" :key="'l-' + i" class="block">
                <div class="block-head">
                  <span>语言 {{ i + 1 }}</span>
                  <el-button v-if="!viewOnly" link type="danger" @click="removeLine(draft.languages, i)">删除</el-button>
                </div>
                <el-row :gutter="18">
                  <el-col :xs="12" :md="12">
                    <el-form-item label="语言">
                      <el-input v-model="row.languageName" placeholder="如：英语 / 日语" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="证书/考试">
                      <el-input v-model="row.certName" placeholder="如：CET-6" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="分数/等级">
                      <el-input v-model="row.certScore" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="听力">
                      <el-select v-model="row.listenLevel" placeholder="请选择" style="width: 100%">
                        <el-option v-for="o in LANGUAGE_LEVEL_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="口语">
                      <el-select v-model="row.speakLevel" placeholder="请选择" style="width: 100%">
                        <el-option v-for="o in LANGUAGE_LEVEL_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="阅读">
                      <el-select v-model="row.readLevel" placeholder="请选择" style="width: 100%">
                        <el-option v-for="o in LANGUAGE_LEVEL_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="写作">
                      <el-select v-model="row.writeLevel" placeholder="请选择" style="width: 100%">
                        <el-option v-for="o in LANGUAGE_LEVEL_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              <el-button v-if="!viewOnly" type="primary" plain @click="draft.languages.push(emptyLanguageLine())">添加语言</el-button>
            </el-collapse-item>

            <!-- 证书 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'cert')"
              title="证书"
              name="cert"
              data-section="cert"
            >
              <div v-for="(row, i) in draft.certificates" :key="'ce-' + i" class="block">
                <div class="block-head">
                  <span>证书 {{ i + 1 }}</span>
                  <el-button v-if="!viewOnly" link type="danger" @click="removeLine(draft.certificates, i)">删除</el-button>
                </div>
                <el-row :gutter="18">
                  <el-col :xs="24" :md="12">
                    <el-form-item label="证书名称">
                      <el-input v-model="row.certName" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="12">
                    <el-form-item label="颁发机构">
                      <el-input v-model="row.issuer" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="取得日期">
                      <el-date-picker v-model="row.obtainDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="编号">
                      <el-input v-model="row.certNo" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              <el-button v-if="!viewOnly" type="primary" plain @click="draft.certificates.push(emptyCertificateLine())">添加证书</el-button>
            </el-collapse-item>

            <!-- 获奖 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'award')"
              title="获奖情况"
              name="award"
              data-section="award"
            >
              <div v-for="(row, i) in draft.awards" :key="'a-' + i" class="block">
                <div class="block-head">
                  <span>奖项 {{ i + 1 }}</span>
                  <el-button v-if="!viewOnly" link type="danger" @click="removeLine(draft.awards, i)">删除</el-button>
                </div>
                <el-row :gutter="18">
                  <el-col :xs="24" :md="12">
                    <el-form-item label="奖项名称">
                      <el-input v-model="row.awardName" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="级别">
                      <el-input v-model="row.awardLevel" placeholder="如：国家级 / 校级" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="12">
                    <el-form-item label="颁发单位">
                      <el-input v-model="row.issuer" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="日期">
                      <el-date-picker v-model="row.awardDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="说明">
                      <el-input v-model="row.description" type="textarea" :rows="2" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              <el-button v-if="!viewOnly" type="primary" plain @click="draft.awards.push(emptyAwardLine())">添加奖项</el-button>
            </el-collapse-item>

            <!-- 著作 -->
            <el-collapse-item
              :ref="(el) => setSectionRef(el, 'pub')"
              title="论文 / 专利 / 著作"
              name="pub"
              data-section="pub"
            >
              <div v-for="(row, i) in draft.publications" :key="'pu-' + i" class="block">
                <div class="block-head">
                  <span>成果 {{ i + 1 }}</span>
                  <el-button v-if="!viewOnly" link type="danger" @click="removeLine(draft.publications, i)">删除</el-button>
                </div>
                <el-row :gutter="18">
                  <el-col :xs="12" :md="8">
                    <el-form-item label="类型">
                      <el-select v-model="row.pubType" placeholder="请选择" style="width: 100%">
                        <el-option v-for="o in PUBLICATION_TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="16">
                    <el-form-item label="题目/名称">
                      <el-input v-model="row.title" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="作者角色">
                      <el-input v-model="row.role" placeholder="一作/通讯等" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="12">
                    <el-form-item label="刊物/会议/专利号">
                      <el-input v-model="row.venue" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="12" :md="12">
                    <el-form-item label="日期">
                      <el-date-picker v-model="row.publishDate" type="month" value-format="YYYY-MM" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="24">
                    <el-form-item label="说明">
                      <el-input v-model="row.description" type="textarea" :rows="2" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              <el-button v-if="!viewOnly" type="primary" plain @click="draft.publications.push(emptyPublicationLine())">添加成果</el-button>
            </el-collapse-item>
          </el-collapse>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, watch } from 'vue'
import type { ResumeParseDraftDto } from '@/api/resumeTypes'
import {
  ACADEMIC_DEGREE_OPTIONS,
  DEGREE_OPTIONS,
  EMPLOYMENT_NATURE_OPTIONS,
  ETHNICITY_OPTIONS,
  GENDER_OPTIONS,
  HUKOU_TYPE_OPTIONS,
  ID_DOC_TYPE_OPTIONS,
  JOB_SEEKING_STATUS_OPTIONS,
  LANGUAGE_LEVEL_OPTIONS,
  POLITICAL_STATUS_OPTIONS,
  PUBLICATION_TYPE_OPTIONS,
  YES_NO_UNKNOWN,
} from '@/constants/resumeOptions'
import {
  emptyAwardLine,
  emptyCampusLine,
  emptyCertificateLine,
  emptyEducationLine,
  emptyLanguageLine,
  emptyProjectLine,
  emptyPublicationLine,
  emptySkillLine,
  emptyWorkLine,
} from '@/utils/resumeDraft'
import { ElCollapseItem } from 'element-plus'
import { PANEL_KEYS, useResumeSectionNav } from '@/composables/useResumeSectionNav'
import { useIsMobile } from '@/composables/useIsMobile'

const isMobile = useIsMobile()

const props = withDefaults(
  defineProps<{
    draft: ResumeParseDraftDto
    /** 详情页只读：禁用录入、隐藏增删、默认展开全部折叠块 */
    viewOnly?: boolean
  }>(),
  { viewOnly: false },
)

const nav = useResumeSectionNav()

watch(
  () => props.viewOnly,
  (v) => {
    if (v) {
      nav.activePanels.value = [...PANEL_KEYS]
    }
  },
  { immediate: true },
)

function removeLine<T>(arr: T[], index: number) {
  arr.splice(index, 1)
}

function setSectionRef(el: unknown, key: string) {
  const item = el as InstanceType<typeof ElCollapseItem> | null
  nav.registerSectionEl(key, item?.$el ?? null)
}

onMounted(() => {
  nextTick(() => {
    nav.observe()
  })
})

onUnmounted(() => {
  nav.disconnect()
})
</script>

<style scoped>
.resume-draft {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 只读详情：弱化禁用态灰底，便于通读长文本 */
.is-view-only :deep(.el-input.is-disabled .el-input__wrapper),
.is-view-only :deep(.el-textarea.is-disabled .el-textarea__inner) {
  background-color: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
  -webkit-text-fill-color: var(--el-text-color-primary);
}

.is-view-only :deep(.el-select .el-select__wrapper.is-disabled) {
  background-color: var(--el-fill-color-blank);
}

.top-tip {
  border-radius: 12px;
}

.resume-draft-form {
  display: block;
}

/* 折叠面板：卡片化分区，模块间距与层次 */
.section-collapse {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: none;
  background: transparent;
}

.section-collapse :deep(.el-collapse-item) {
  margin: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  overflow: hidden;
  background: var(--el-bg-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  scroll-margin-top: 90px;
}

/* 移动端：胶囊导航条吸顶（约 66 + 44px），跳转目标避开双层吸顶栏 */
@media (max-width: 991px) {
  .section-collapse :deep(.el-collapse-item) {
    scroll-margin-top: 120px;
  }
}

.section-collapse :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 52px;
  padding: 14px 20px;
  font-family: var(--xt-font-title);
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.section-collapse :deep(.el-collapse-item__arrow) {
  margin: 0 0 0 8px;
}

.section-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background: var(--el-fill-color-blank);
}

.section-collapse :deep(.el-collapse-item__content) {
  padding: 22px 20px 10px;
}

.hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.hint.warn {
  color: var(--el-color-warning-dark-2);
}

.section-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.55;
}

.block {
  padding: 16px 16px 8px;
  margin-bottom: 18px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-light);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--el-border-color-lighter);
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

/* 顶对齐标签：输入区左缘对齐，避免长短标签导致参差不齐 */
.resume-draft-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.resume-draft-form :deep(.el-form-item__label) {
  display: block;
  width: 100% !important;
  padding: 0 0 6px;
  margin: 0 !important;
  line-height: 1.4;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  text-align: left;
}

.resume-draft-form :deep(.el-form-item__content) {
  line-height: 1.5;
}

.resume-draft-form :deep(.el-input__wrapper),
.resume-draft-form :deep(.el-textarea__inner) {
  width: 100%;
}

.resume-draft-form :deep(.el-select),
.resume-draft-form :deep(.el-date-editor) {
  width: 100%;
}

/* —— 移动端密度：短字段已半宽，纵向节奏同步收紧 —— */
@media (max-width: 991px) {
  .resume-draft {
    gap: 14px;
  }

  .section-collapse {
    gap: 14px;
  }

  .section-collapse :deep(.el-collapse-item__content) {
    padding: 14px 14px 6px;
  }

  .block {
    padding: 12px 12px 4px;
    margin-bottom: 12px;
  }

  .block-head {
    margin-bottom: 8px;
    padding-bottom: 8px;
  }

  .resume-draft-form :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  .section-hint {
    margin-bottom: 10px;
  }

  /* 半宽列 gutter 收紧（el-row gutter 是内联 padding，需覆盖） */
  .section-collapse :deep(.el-row [class*='el-col']) {
    padding-left: 6px !important;
    padding-right: 6px !important;
  }
}

</style>
