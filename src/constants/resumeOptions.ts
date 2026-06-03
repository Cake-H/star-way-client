/** 下拉选项：与后端整型/枚举约定可能不完全一致时，以服务端落库校验为准；此处便于快速录入 */

import type { LabelValue } from '@/constants/selectTypes'

export const GENDER_OPTIONS: LabelValue<number | null>[] = [
  { label: '未选择', value: null },
  { label: '男', value: 1 },
  { label: '女', value: 2 },
  { label: '未知', value: 0 },
]

export const YES_NO_UNKNOWN: LabelValue<number | null>[] = [
  { label: '未选择', value: null },
  { label: '是', value: 1 },
  { label: '否', value: 0 },
]

export const ID_DOC_TYPE_OPTIONS: LabelValue<string>[] = [
  { label: '请选择', value: '' },
  { label: '居民身份证', value: 'ID_CARD' },
  { label: '护照', value: 'PASSPORT' },
  { label: '港澳居民来往内地通行证', value: 'HK_MACAU_PERMIT' },
  { label: '台湾居民来往大陆通行证', value: 'TAIWAN_PERMIT' },
  { label: '其他', value: 'OTHER' },
]

export const POLITICAL_STATUS_OPTIONS: LabelValue<string>[] = [
  { label: '请选择', value: '' },
  { label: '群众', value: 'MASSES' },
  { label: '共青团员', value: 'CYL' },
  { label: '中共党员', value: 'CPC' },
  { label: '中共预备党员', value: 'CPC_PROBATION' },
  { label: '民主党派', value: 'DEMOCRATIC_PARTIES' },
  { label: '无党派人士', value: 'NON_PARTISAN' },
]

export const HUKOU_TYPE_OPTIONS: LabelValue<string>[] = [
  { label: '请选择', value: '' },
  { label: '城镇', value: 'URBAN' },
  { label: '农村', value: 'RURAL' },
  { label: '集体户口', value: 'COLLECTIVE' },
]

export const ETHNICITY_OPTIONS: LabelValue<string>[] = [
  { label: '请选择', value: '' },
  { label: '汉族', value: '汉族' },
  { label: '回族', value: '回族' },
  { label: '满族', value: '满族' },
  { label: '维吾尔族', value: '维吾尔族' },
  { label: '苗族', value: '苗族' },
  { label: '彝族', value: '彝族' },
  { label: '土家族', value: '土家族' },
  { label: '藏族', value: '藏族' },
  { label: '蒙古族', value: '蒙古族' },
  { label: '壮族', value: '壮族' },
  { label: '布依族', value: '布依族' },
  { label: '侗族', value: '侗族' },
  { label: '瑶族', value: '瑶族' },
  { label: '朝鲜族', value: '朝鲜族' },
  { label: '其他', value: '其他' },
]

/** 求职状态：与后端枚举值需对齐时可再改 */
export const JOB_SEEKING_STATUS_OPTIONS: LabelValue<number | null>[] = [
  { label: '未选择', value: null },
  { label: '在职看机会', value: 1 },
  { label: '在职急寻', value: 2 },
  { label: '离职', value: 3 },
  { label: '应届/在校生', value: 4 },
]

export const DEGREE_OPTIONS: LabelValue<string>[] = [
  { label: '请选择', value: '' },
  { label: '高中及以下', value: 'HIGH_SCHOOL' },
  { label: '大专', value: 'COLLEGE' },
  { label: '本科', value: 'BACHELOR' },
  { label: '硕士', value: 'MASTER' },
  { label: '博士', value: 'PHD' },
  { label: '其他', value: 'OTHER' },
]

export const ACADEMIC_DEGREE_OPTIONS: LabelValue<string>[] = [
  { label: '请选择', value: '' },
  { label: '学士', value: '学士' },
  { label: '硕士', value: '硕士' },
  { label: '博士', value: '博士' },
  { label: '无', value: '无' },
]

export const EMPLOYMENT_NATURE_OPTIONS: LabelValue<string>[] = [
  { label: '请选择', value: '' },
  { label: '全职', value: 'FULL_TIME' },
  { label: '实习', value: 'INTERN' },
  { label: '兼职', value: 'PART_TIME' },
  { label: '外包/派遣', value: 'OUTSOURCE' },
  { label: '自由职业', value: 'FREELANCE' },
]

export const LANGUAGE_LEVEL_OPTIONS: LabelValue<string>[] = [
  { label: '请选择', value: '' },
  { label: '入门', value: '入门' },
  { label: '日常交流', value: '日常交流' },
  { label: '工作应用', value: '工作应用' },
  { label: '精通', value: '精通' },
  { label: '母语', value: '母语' },
]

export const PUBLICATION_TYPE_OPTIONS: LabelValue<string>[] = [
  { label: '请选择', value: '' },
  { label: '期刊论文', value: 'JOURNAL' },
  { label: '会议论文', value: 'CONFERENCE' },
  { label: '专利', value: 'PATENT' },
  { label: '著作', value: 'BOOK' },
  { label: '其他', value: 'OTHER' },
]
