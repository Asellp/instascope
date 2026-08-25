// User & Auth DTOs
export interface User {
  id: string
  email: string
  name?: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterDto {
  email: string
  password: string
  name?: string
}

// Account Wizard DTOs
export type SourceType = 'api' | 'scrape'
export type Frequency = 'hourly' | 'daily' | 'weekly'

export interface CreateAccountDto {
  username: string
  sourceType: SourceType
  frequency: Frequency
}