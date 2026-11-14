import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'
import type { MemberCounts, MemberSearchResult, SearchResultPage } from '~/types/admin'

export interface MemberRepository {
  searchMembers(searchTerm: string, limit: number): Promise<SearchResultPage<MemberSearchResult>>
  // joinedSince counts members created from `since` up to `until`
  countMembers(since: Date, until: Date): Promise<MemberCounts>
  countMembersJoinedBefore(date: Date): Promise<number>
  // created_at of every member who joined in [from, to), oldest first
  listJoinTimes(from: Date, to: Date): Promise<string[]>
}

// Matches max_rows in supabase/config.toml: PostgREST silently caps larger responses
const PAGE_SIZE = 1000

// Characters with meaning inside a PostgREST or() filter or an ILIKE pattern
const FILTER_SYNTAX_CHARACTERS = /[,()%_\\*]/g

// Phones are stored the way Supabase Auth keeps them (66812345678), but staff type 081-234-5678
function toStoredPhoneDigits(searchTerm: string) {
  const digits = searchTerm.replace(/\D/g, '')
  return digits.startsWith('0') ? `66${digits.slice(1)}` : digits
}

export function createSupabaseMemberRepository(supabase: SupabaseClient<Database>): MemberRepository {
  return {
    async countMembers(since, until) {
      // head: true returns only the count, no rows
      const [all, joined] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('members').select('id', { count: 'exact', head: true })
          .gte('created_at', since.toISOString())
          .lt('created_at', until.toISOString())
      ])
      if (all.error) throw all.error
      if (joined.error) throw joined.error
      return { total: all.count ?? 0, joinedSince: joined.count ?? 0 }
    },

    async countMembersJoinedBefore(date) {
      const { count, error } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', date.toISOString())
      if (error) throw error
      return count ?? 0
    },

    async listJoinTimes(from, to) {
      const joinTimes: string[] = []
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('members')
          .select('created_at')
          .gte('created_at', from.toISOString())
          .lt('created_at', to.toISOString())
          .order('created_at')
          .order('id')
          .range(offset, offset + PAGE_SIZE - 1)
        if (error) throw error
        joinTimes.push(...data.map(row => row.created_at))
        if (data.length < PAGE_SIZE) return joinTimes
      }
    },

    async searchMembers(searchTerm, limit) {
      const text = searchTerm.replace(FILTER_SYNTAX_CHARACTERS, ' ').trim()
      if (!text) return { items: [], totalCount: 0 }

      const conditions = [`first_name.ilike.*${text}*`, `last_name.ilike.*${text}*`, `member_code.ilike.*${text}*`]
      const phoneDigits = toStoredPhoneDigits(text)
      if (phoneDigits.length >= 3) conditions.push(`phone.like.*${phoneDigits}*`)

      const { data, count, error } = await supabase
        .from('members')
        .select('id, member_code, first_name, last_name, phone', { count: 'exact' })
        .or(conditions.join(','))
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error

      return {
        totalCount: count ?? data.length,
        items: data.map(member => ({
          id: member.id,
          memberCode: member.member_code,
          fullName: `${member.first_name} ${member.last_name}`.trim(),
          phone: member.phone,
          // TODO: fill from the points ledger once it exists
          tierName: null,
          pointsBalance: null
        }))
      }
    }
  }
}
