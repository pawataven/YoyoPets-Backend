import { useRepositories } from '~/repositories'
import type { MemberSearchResult, OrderSearchResult, RedemptionSearchResult, SearchResultPage } from '~/types/admin'

const SEARCH_DEBOUNCE_MS = 250
const RESULTS_PER_GROUP = 3

export interface GlobalSearchResults {
  members: SearchResultPage<MemberSearchResult>
  orders: SearchResultPage<OrderSearchResult>
  redemptions: SearchResultPage<RedemptionSearchResult>
}

function emptyPage<T>(): SearchResultPage<T> {
  return { items: [], totalCount: 0 }
}

function emptyResults(): GlobalSearchResults {
  return { members: emptyPage(), orders: emptyPage(), redemptions: emptyPage() }
}

export function useGlobalSearch() {
  const { member, order, redemption } = useRepositories()

  const searchTerm = ref('')
  const results = ref<GlobalSearchResults>(emptyResults())
  const isSearching = ref(false)
  const hasFailedGroup = ref(false)
  let pendingSearch: ReturnType<typeof setTimeout> | undefined
  // Responses can arrive out of order; only the latest search may write results
  let latestSearchId = 0

  const totalCount = computed(() =>
    results.value.members.totalCount + results.value.orders.totalCount + results.value.redemptions.totalCount
  )

  watch(searchTerm, (term) => {
    clearTimeout(pendingSearch)
    if (!term.trim()) {
      latestSearchId++
      results.value = emptyResults()
      hasFailedGroup.value = false
      isSearching.value = false
      return
    }
    isSearching.value = true
    pendingSearch = setTimeout(() => runSearch(term), SEARCH_DEBOUNCE_MS)
  })

  async function runSearch(term: string) {
    const searchId = ++latestSearchId
    // One failing source (e.g. the database) should not hide matches from the others
    const [members, orders, redemptions] = await Promise.allSettled([
      member.searchMembers(term, RESULTS_PER_GROUP),
      order.searchOrders(term, RESULTS_PER_GROUP),
      redemption.searchRedemptions(term, RESULTS_PER_GROUP)
    ])
    if (searchId !== latestSearchId) return

    results.value = {
      members: members.status === 'fulfilled' ? members.value : emptyPage(),
      orders: orders.status === 'fulfilled' ? orders.value : emptyPage(),
      redemptions: redemptions.status === 'fulfilled' ? redemptions.value : emptyPage()
    }
    hasFailedGroup.value = [members, orders, redemptions].some(result => result.status === 'rejected')
    isSearching.value = false
  }

  onScopeDispose(() => clearTimeout(pendingSearch))

  return { searchTerm, results, totalCount, isSearching, hasFailedGroup }
}
