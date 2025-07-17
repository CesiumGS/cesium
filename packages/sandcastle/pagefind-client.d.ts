/*
 * Sourced from https://github.com/Pagefind/pagefind/blob/main/pagefind_web_js/types/index.d.ts
 */

export {};

declare global {
  /** Global index options that can be passed to pagefind.options() */
  type PagefindIndexOptions = {
    /** Overrides the URL path that Pagefind uses to load its search bundle */
    basePath?: string;
    /** Appends the given baseURL to all search results. May be a path, or a full domain */
    baseUrl?: string;
    /** The maximum length of excerpts that Pagefind should generate for search results. Default to 30 */
    excerptLength?: number;
    /**
     * Multiply all rankings for this index by the given weight.
     *
     * Only applies in multisite setups, where one site should rank higher or lower than others.
     */
    indexWeight?: number;
    /**
     * Merge this filter object into all search queries in this index.
     *
     * Only applies in multisite setups.
     */
    mergeFilter?: object;
    /**
     * If set, will ass the search term as a query parameter under this key, for use with Pagefind's highlighting script.
     */
    highlightParam?: string;
    language?: string;
    /**
     * Whether an instance of Pagefind is the primary index or not (for multisite).
     *
     * This is set for you automatically, so it is unlikely you should set this directly.
     */
    primary?: boolean;
    /**
     * Provides the ability to fine tune Pagefind's ranking algorithm to better suit your dataset.
     */
    ranking?: PagefindRankingWeights;
  };

  type PagefindRankingWeights = {
    /**
            Controls page ranking based on similarity of terms to the search query (in length).
            Increasing this number means pages rank higher when they contain words very close to the query,
            e.g. if searching for `part` then `party` will boost a page higher than one containing `partition`.
            Minimum value is 0.0, where `party` and `partition` would be viewed equally.
        */
    termSimilarity?: number;
    /**
            Controls how much effect the average page length has on ranking.
            Maximum value is 1.0, where ranking will strongly favour pages that are shorter than the average page on the site.
            Minimum value is 0.0, where ranking will exclusively look at term frequency, regardless of how long a document is.
        */
    pageLength?: number;
    /**
            Controls how quickly a term saturates on the page and reduces impact on the ranking.
            Maximum value is 2.0, where pages will take a long time to saturate, and pages with very high term frequencies will take over.
            As this number trends to 0, it does not take many terms to saturate and allow other paramaters to influence the ranking.
            Minimum value is 0.0, where terms will saturate immediately and results will not distinguish between one term and many.
        */
    termSaturation?: number;
    /**
            Controls how much ranking uses term frequency versus raw term count.
            Maximum value is 1.0, where term frequency fully applies and is the main ranking factor.
            Minimum value is 0.0, where term frequency does not apply, and pages are ranked based on the raw sum of words and weights.
            Values between 0.0 and 1.0 will interpolate between the two ranking methods.
            Reducing this number is a good way to boost longer documents in your search results, as they no longer get penalized for having a low term frequency.
         */
    termFrequency?: number;
  };

  /** Options that can be passed to pagefind.search() */
  type PagefindSearchOptions = {
    /** If set, this call will load all assets but return before searching. Prefer using pagefind.preload() instead */
    preload?: boolean;
    /** Add more verbose console logging for this search query */
    verbose?: boolean;
    /** The set of filters to execute with this search. Input type is extremely flexible, see the filtering docs for details */
    filters?: object;
    /** The set of sorts to use for this search, instead of relevancy */
    sort?: object;
  };

  /** Filter counts returned from pagefind.filters(), and alongside results from pagefind.search() */
  type PagefindFilterCounts = Record<string, Record<string, number>>;

  /** The main results object returned from a call to pagefind.search() */
  type PagefindSearchResults = {
    /** All pages that match the search query and filters provided */
    results: PagefindSearchResult[];
    /** How many results would there have been if you had omitted the filters */
    unfilteredResultCount: number;
    /** Given the query and filters provided, how many remaining results are there under each filter? */
    filters: PagefindFilterCounts;
    /** If the searched filters were removed, how many total results for each filter are there? */
    totalFilters: PagefindFilterCounts;
    /** Information on how long it took Pagefind to execute this query */
    timings: {
      preload: number;
      search: number;
      total: number;
    };
    /** Verbose information on stemming returned in the Pagefind Playground */
    search_keywords?: string[];
  };

  /** The main results object returned from a call to pagefind.search() */
  type PagefindIndexesSearchResults = {
    /** All pages that match the search query and filters provided */
    results: PagefindSearchResult[];
    /** How many results would there have been if you had omitted the filters */
    unfilteredResultCount: number;
    /** Given the query and filters provided, how many remaining results are there under each filter? */
    filters: PagefindFilterCounts;
    /** If the searched filters were removed, how many total results for each filter are there? */
    totalFilters: PagefindFilterCounts;
    /** Information on how long it took Pagefind to execute this query */
    timings: {
      preload: number;
      search: number;
      total: number;
    }[];
    /** Verbose information on stemming returned in the Pagefind Playground */
    search_keywords?: string[];
  };

  /** A single result from a search query, before actual data has been loaded */
  type PagefindSearchResult = {
    /** Pagefind's internal ID for this page, unique across the site */
    id: string;
    /** Pagefind's internal score for your query matching this page, that is used when ranking these results */
    score: number;
    /** The locations of all matching words in this page */
    words: number[];
    /** Verbose information returned in the Pagefind playground mode */
    params?: PagefindTermParams;
    /** Verbose information returned in the Pagefind playground mode */
    scores?: PagefindTermScore[];
    /**
     * Calling data() loads the final data fragment needed to display this result.
     *
     * Only call this when you need to display the data, rather than all at once.
     * (e.g. one page as a time, or in a scroll listener)
     * */
    data: () => Promise<PagefindSearchFragment>;
  };

  export type PagefindTermParams = {
    /** Length of this result */
    document_length: number;
    /** Average page length */
    average_page_length: number;
    /** Total pages */
    total_pages: number;
  };

  type PagefindTermScore = {
    /** Term */
    search_term: string;
    /** Inverse document frequency for term — how common is this word */
    idf: number;
    /** Term frequency, saturating */
    saturating_tf: number;
    /** Term frequency, raw counts */
    raw_tf: number;
    /** Pagefind output term frequency */
    pagefind_tf: number;
    /** Final score for term */
    score: number;
    /** Input parameters used for the score */
    params: PagefindTermScoreParams;
  };

  export type PagefindTermScoreParams = {
    /** Weighted term frequency */
    weighted_term_frequency: number;
    /** Pages containing term */
    pages_containing_term: number;
    /** Length bonus */
    length_bonus: number;
  };

  /** The useful data Pagefind provides for a search result */
  type PagefindSearchFragment = {
    /** Pagefind's processed URL for this page. Will include the baseUrl if configured */
    url: string;
    /** Pagefind's unprocessed URL for this page */
    raw_url?: string;
    /** The full processed content text of this page */
    content: string;
    /** Internal type — ignore for now */
    raw_content?: string;
    /** The processed excerpt for this result, with matching terms wrapping in `<mark>` elements */
    excerpt: string;
    /**
     * What regions of the page matched this search query?
     *
     * Precalculates based on h1->6 tags with IDs, using the text between each.
     */
    sub_results: PagefindSubResult[];
    /** How many total words are there on this page? */
    word_count: number;
    /** The locations of all matching words in this page */
    locations: number[];
    /**
     * The locations of all matching words in this page,
     * paired with data about their weight and relevance to this query
     */
    weighted_locations: PagefindWordLocation[];
    /** The filter keys and values this page was tagged with */
    filters: Record<string, string[]>;
    /** The metadata keys and values this page was tagged with */
    meta: Record<string, string>;
    /**
     * The raw anchor data that Pagefind used to generate sub_results.
     *
     * Contains _all_ elements that had IDs on the page, so can be used to
     * implement your own sub result calculations with different semantics.
     */
    anchors: PagefindSearchAnchor[];
  };

  /** Data for a matched section within a page */
  type PagefindSubResult = {
    /**
     * Title of this sub result — derived from the heading content.
     *
     * If this is a result for the section of the page before any headings with IDs,
     * this will be the same as the page's meta.title value.
     */
    title: string;
    /**
     * Direct URL to this sub result, comprised of the page's URL plus the hash string of the heading.
     *
     * If this is a result for the section of the page before any headings with IDs,
     * this will be the same as the page URL.
     */
    url: string;
    /** The locations of all matching words in this segment */
    locations: number[];
    /**
     * The locations of all matching words in this segment,
     * paired with data about their weight and relevance to this query
     */
    weighted_locations: PagefindWordLocation[];
    /** The processed excerpt for this segment, with matching terms wrapping in `<mark>` elements */
    excerpt: string;
    /**
     * Raw data about the anchor element associated with this sub result.
     *
     * The omission of this field means this sub result is for text found on the page
     * before the first heading that had an ID.
     */
    anchor?: PagefindSearchAnchor;
  };

  /** Information about a matching word on a page */
  type PagefindWordLocation = {
    /** The weight that this word was originally tagged as */
    weight: number;
    /**
     * An internal score that Pagefind calculated for this word.
     *
     * The absolute value is somewhat meaningless, but the value can be used
     * in comparison to other values in this set of search results to perform custom ranking.
     */
    balanced_score: number;
    /**
     * The index of this word in the result content.
     *
     * Splitting the content key by whitespacing and indexing by this number
     * will yield the correct word.
     */
    location: number;
    /**
     * Verbose word information returned when running Pagefind in playground mode.
     */
    verbose?: PagefindVerboseWordLocation;
  };

  /** Verbose playground information about a matching word on a page */
  type PagefindVerboseWordLocation = {
    /**
     * The indexed string for this word, usually stemmed.
     */
    word_string: string;
    /**
     * The scoring bonus this word received based on length similarity to a search term.
     */
    length_bonus: number;
  };

  /** Raw data about elements with IDs that Pagefind encountered when indexing the page */
  type PagefindSearchAnchor = {
    /** What element type was this anchor? e.g. `h1`, `div` */
    element: string;
    /** The raw id="..." attribute contents of the element */
    id: string;
    /**
     * The text content of this element.
     *
     * In order to prevent repeating most of the page data for every anchor,
     * Pagefind will only take top level text nodes, or text nodes nested within
     * inline elements such as <a> and <span>.
     */
    text?: string;
    /**
     * The position of this anchor in the result content.
     * Splitting the content key by whitespacing and indexing by this number
     * will yield the first word indexed after this element's ID was found.
     */
    location: number;
  };
}
