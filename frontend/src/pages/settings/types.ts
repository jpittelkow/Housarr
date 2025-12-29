import type { StorageSettings, EmailSettings, AISettings } from '@/services/api'

export type SettingsState = {
  storage: StorageSettings
  email: EmailSettings
  ai: AISettings
  aiKeyEditing: { anthropic: boolean; openai: boolean; gemini: boolean; local: boolean }
}

export type SettingsAction =
  | { type: 'SET_STORAGE'; payload: Partial<StorageSettings> }
  | { type: 'SET_EMAIL'; payload: Partial<EmailSettings> }
  | { type: 'SET_AI'; payload: Partial<AISettings> }
  | { type: 'SET_AI_KEY_EDITING'; payload: Partial<SettingsState['aiKeyEditing']> }
  | { type: 'RESET_STORAGE'; payload: StorageSettings }
  | { type: 'RESET_EMAIL'; payload: EmailSettings }
  | { type: 'RESET_AI'; payload: AISettings }
  | { type: 'RESET_AI_KEY_EDITING' }

export const initialSettingsState: SettingsState = {
  storage: {
    storage_driver: 'local',
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_default_region: '',
    aws_bucket: '',
    aws_endpoint: '',
  },
  email: {
    mail_driver: 'log',
    mail_host: '',
    mail_port: 587,
    mail_username: '',
    mail_password: '',
    mail_encryption: 'tls',
    mail_from_address: '',
    mail_from_name: '',
    mailgun_domain: '',
    mailgun_secret: '',
    mailgun_endpoint: 'api.mailgun.net',
    sendgrid_api_key: '',
    ses_key: '',
    ses_secret: '',
    ses_region: 'us-east-1',
    cloudflare_api_token: '',
    cloudflare_account_id: '',
  },
  ai: {
    ai_provider: 'none',
    ai_model: '',
    anthropic_api_key: '',
    openai_api_key: '',
    openai_base_url: '',
    gemini_api_key: '',
    gemini_base_url: '',
    local_base_url: '',
    local_model: '',
    local_api_key: '',
  },
  aiKeyEditing: { anthropic: false, openai: false, gemini: false, local: false },
}

export function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_STORAGE':
      return { ...state, storage: { ...state.storage, ...action.payload } }
    case 'SET_EMAIL':
      return { ...state, email: { ...state.email, ...action.payload } }
    case 'SET_AI':
      return { ...state, ai: { ...state.ai, ...action.payload } }
    case 'SET_AI_KEY_EDITING':
      return { ...state, aiKeyEditing: { ...state.aiKeyEditing, ...action.payload } }
    case 'RESET_STORAGE':
      return { ...state, storage: action.payload }
    case 'RESET_EMAIL':
      return { ...state, email: action.payload }
    case 'RESET_AI':
      return { ...state, ai: action.payload }
    case 'RESET_AI_KEY_EDITING':
      return { ...state, aiKeyEditing: { anthropic: false, openai: false, gemini: false, local: false } }
    default:
      return state
  }
}
