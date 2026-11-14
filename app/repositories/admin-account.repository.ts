import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'
import type { AdminAccount, AdminRole } from '~/types/admin'

export interface AdminAccountRepository {
  // null when the user has no admin_users row or has been deactivated
  getActiveAccount(userId: string): Promise<AdminAccount | null>
}

const ADMIN_ROLES: readonly string[] = ['super_admin', 'admin'] satisfies AdminRole[]

function isAdminRole(role: string): role is AdminRole {
  return ADMIN_ROLES.includes(role)
}

export function createSupabaseAdminAccountRepository(supabase: SupabaseClient<Database>): AdminAccountRepository {
  return {
    async getActiveAccount(userId) {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id, email, display_name, role, is_active')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      if (!data?.is_active || !isAdminRole(data.role)) return null
      return { userId: data.user_id, email: data.email, displayName: data.display_name, role: data.role }
    }
  }
}
