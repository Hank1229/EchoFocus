import type { Category } from '../types/tracking'

// Default domain categorizations — 120+ domains pre-classified.
// Key: root domain (without www.)  Value: Category
// Users can override any of these via custom rules.
export const DEFAULT_CATEGORIES: Record<string, Category> = {
  // ─── PRODUCTIVE ────────────────────────────────────────────────────────────

  // Version control & code hosting
  'github.com': 'productive',
  'gitlab.com': 'productive',
  'bitbucket.org': 'productive',
  'sourcehut.org': 'productive',
  'gitea.io': 'productive',

  // Developer Q&A & communities
  'stackoverflow.com': 'productive',
  'stackexchange.com': 'productive',
  'superuser.com': 'productive',
  'serverfault.com': 'productive',
  'askubuntu.com': 'productive',
  'dev.to': 'productive',
  'hashnode.com': 'productive',
  'news.ycombinator.com': 'productive',
  'lobste.rs': 'productive',

  // Documentation & references
  'developer.mozilla.org': 'productive',
  'mdn.mozilla.org': 'productive',
  'w3schools.com': 'productive',
  'devdocs.io': 'productive',
  'devhints.io': 'productive',
  'quickref.me': 'productive',
  'cheatography.com': 'productive',
  'tldr.sh': 'productive',
  'explainshell.com': 'productive',
  'regex101.com': 'productive',
  'regexr.com': 'productive',

  // Coding playgrounds
  'codepen.io': 'productive',
  'jsfiddle.net': 'productive',
  'codesandbox.io': 'productive',
  'replit.com': 'productive',
  'stackblitz.com': 'productive',
  'glitch.com': 'productive',

  // Project management & collaboration
  'notion.so': 'productive',
  'linear.app': 'productive',
  'jira.atlassian.com': 'productive',
  'confluence.atlassian.com': 'productive',
  'trello.com': 'productive',
  'asana.com': 'productive',
  'monday.com': 'productive',
  'basecamp.com': 'productive',
  'clickup.com': 'productive',
  'airtable.com': 'productive',
  'coda.io': 'productive',

  // Design & creative tools
  'figma.com': 'productive',
  'sketch.com': 'productive',
  'miro.com': 'productive',
  'whimsical.com': 'productive',
  'excalidraw.com': 'productive',
  'lucid.app': 'productive',
  'app.diagrams.net': 'productive',

  // Communication (work-focused)
  'slack.com': 'productive',
  'zoom.us': 'productive',
  'meet.google.com': 'productive',
  'teams.microsoft.com': 'productive',
  'webex.com': 'productive',
  'whereby.com': 'productive',

  // Cloud & DevOps
  'console.cloud.google.com': 'productive',
  'aws.amazon.com': 'productive',
  'portal.azure.com': 'productive',
  'vercel.com': 'productive',
  'netlify.com': 'productive',
  'render.com': 'productive',
  'railway.app': 'productive',
  'fly.io': 'productive',
  'heroku.com': 'productive',
  'docker.com': 'productive',
  'kubernetes.io': 'productive',
  'terraform.io': 'productive',
  'grafana.com': 'productive',
  'sentry.io': 'productive',
  'datadog.com': 'productive',
  'newrelic.com': 'productive',

  // API development
  'postman.com': 'productive',
  'insomnia.rest': 'productive',
  'hoppscotch.io': 'productive',

  // Productivity & notes
  'docs.google.com': 'productive',
  'drive.google.com': 'productive',
  'sheets.google.com': 'productive',
  'slides.google.com': 'productive',
  'office.com': 'productive',
  'word.live.com': 'productive',
  'excel.office.com': 'productive',

  // Learning platforms
  'coursera.org': 'productive',
  'udemy.com': 'productive',
  'edx.org': 'productive',
  'khanacademy.org': 'productive',
  'pluralsight.com': 'productive',
  'skillshare.com': 'productive',
  'frontendmasters.com': 'productive',
  'egghead.io': 'productive',
  'laracasts.com': 'productive',
  'freecodecamp.org': 'productive',
  'theodinproject.com': 'productive',
  'roadmap.sh': 'productive',
  'brilliant.org': 'productive',
  'codecademy.com': 'productive',
  'boot.dev': 'productive',

  // Research & academic
  'arxiv.org': 'productive',
  'scholar.google.com': 'productive',
  'semanticscholar.org': 'productive',
  'researchgate.net': 'productive',
  'pubmed.ncbi.nlm.nih.gov': 'productive',
  'jstor.org': 'productive',
  'acm.org': 'productive',
  'ieeexplore.ieee.org': 'productive',

  // Coding challenges
  'leetcode.com': 'productive',
  'hackerrank.com': 'productive',
  'codewars.com': 'productive',
  'exercism.org': 'productive',
  'codeforces.com': 'productive',
  'topcoder.com': 'productive',
  'projecteuler.net': 'productive',
  'atcoder.jp': 'productive',
  'interviewbit.com': 'productive',

  // Package registries & tech references
  'npmjs.com': 'productive',
  'pypi.org': 'productive',
  'crates.io': 'productive',
  'packagist.org': 'productive',
  'pub.dev': 'productive',
  'nuget.org': 'productive',
  'mvnrepository.com': 'productive',
  'bundlephobia.com': 'productive',

  // AI & ML tools (work)
  'chat.openai.com': 'productive',
  'claude.ai': 'productive',
  'anthropic.com': 'productive',
  'openai.com': 'productive',
  'huggingface.co': 'productive',
  'replicate.com': 'productive',
  'perplexity.ai': 'productive',
  'gemini.google.com': 'productive',
  'copilot.microsoft.com': 'productive',

  // Tech blogs & learning
  'smashingmagazine.com': 'productive',
  'css-tricks.com': 'productive',
  'web.dev': 'productive',
  'geeksforgeeks.org': 'productive',
  'baeldung.com': 'productive',
  'digitalocean.com': 'productive',
  'medium.com': 'productive',

  // Developer tools
  'jsonformatter.org': 'productive',
  'jsonlint.com': 'productive',
  'caniuse.com': 'productive',
  'bundlejs.com': 'productive',
  'transform.tools': 'productive',
  'typescriptlang.org': 'productive',
  'rust-lang.org': 'productive',
  'go.dev': 'productive',
  'python.org': 'productive',

  // CMS & website builders (work)
  'wordpress.com': 'productive',
  'webflow.com': 'productive',
  'ghost.org': 'productive',

  // Data & analytics tools
  'datastudio.google.com': 'productive',
  'lookerstudio.google.com': 'productive',
  'tableau.com': 'productive',
  'metabase.com': 'productive',

  // ─── DISTRACTION ───────────────────────────────────────────────────────────

  // Video streaming
  'youtube.com': 'distraction',
  'netflix.com': 'distraction',
  'twitch.tv': 'distraction',
  'disneyplus.com': 'distraction',
  'hulu.com': 'distraction',
  'hbomax.com': 'distraction',
  'max.com': 'distraction',
  'primevideo.com': 'distraction',
  'peacocktv.com': 'distraction',
  'crunchyroll.com': 'distraction',
  'funimation.com': 'distraction',
  'bilibili.com': 'distraction',
  'dailymotion.com': 'distraction',
  'iqiyi.com': 'distraction',
  'youku.com': 'distraction',
  'mango.tv': 'distraction',

  // Social media
  'facebook.com': 'distraction',
  'instagram.com': 'distraction',
  'twitter.com': 'distraction',
  'x.com': 'distraction',
  'tiktok.com': 'distraction',
  'reddit.com': 'distraction',
  'snapchat.com': 'distraction',
  'pinterest.com': 'distraction',
  'tumblr.com': 'distraction',
  'weibo.com': 'distraction',
  'douyin.com': 'distraction',
  'xiaohongshu.com': 'distraction',
  'threads.net': 'distraction',
  'mastodon.social': 'distraction',
  'bsky.app': 'distraction',

  // Entertainment & gaming
  '9gag.com': 'distraction',
  'buzzfeed.com': 'distraction',
  'ign.com': 'distraction',
  'gamespot.com': 'distraction',
  'polygon.com': 'distraction',
  'kotaku.com': 'distraction',
  'pcgamer.com': 'distraction',
  'steam.com': 'distraction',
  'store.steampowered.com': 'distraction',
  'epicgames.com': 'distraction',
  'roblox.com': 'distraction',
  'fandom.com': 'distraction',
  'knowyourmeme.com': 'distraction',
  'ifunny.co': 'distraction',

  // Celebrity & gossip
  'tmz.com': 'distraction',
  'people.com': 'distraction',
  'eonline.com': 'distraction',
  'justjared.com': 'distraction',
  'hollywoodlife.com': 'distraction',

  // Sports (leisure)
  'espn.com': 'distraction',
  'nba.com': 'distraction',
  'nfl.com': 'distraction',
  'mlb.com': 'distraction',
  'cbssports.com': 'distraction',

  // Kuaishou
  'kuaishou.com': 'distraction',

  // ─── NEUTRAL ───────────────────────────────────────────────────────────────

  // Search engines
  'google.com': 'neutral',
  'bing.com': 'neutral',
  'duckduckgo.com': 'neutral',
  'yahoo.com': 'neutral',
  'baidu.com': 'neutral',
  'yandex.com': 'neutral',
  'ecosia.org': 'neutral',

  // Email clients
  'gmail.com': 'neutral',
  'mail.google.com': 'neutral',
  'outlook.com': 'neutral',
  'mail.yahoo.com': 'neutral',
  'proton.me': 'neutral',
  'protonmail.com': 'neutral',

  // Calendars & scheduling
  'calendar.google.com': 'neutral',
  'calendar.apple.com': 'neutral',
  'calendly.com': 'neutral',

  // Maps & navigation
  'maps.google.com': 'neutral',
  'maps.apple.com': 'neutral',

  // Weather
  'weather.com': 'neutral',
  'accuweather.com': 'neutral',

  // Reference
  'wikipedia.org': 'neutral',
  'wikimedia.org': 'neutral',
  'translate.google.com': 'neutral',
  'deepl.com': 'neutral',

  // E-commerce / shopping
  'amazon.com': 'neutral',
  'ebay.com': 'neutral',
  'shopee.com': 'neutral',
  'taobao.com': 'neutral',
  'jd.com': 'neutral',
  'rakuten.com': 'neutral',
  'aliexpress.com': 'neutral',

  // Finance / banking
  'paypal.com': 'neutral',
  'stripe.com': 'neutral',
  'wise.com': 'neutral',
  'revolut.com': 'neutral',
  'chase.com': 'neutral',
  'bankofamerica.com': 'neutral',

  // Cloud storage
  'dropbox.com': 'neutral',
  'box.com': 'neutral',
  'icloud.com': 'neutral',

  // Misc / system
  'localhost': 'neutral',
  '127.0.0.1': 'neutral',

  // Communication (general)
  'discord.com': 'neutral',
  'telegram.org': 'neutral',
  'web.telegram.org': 'neutral',
  'web.whatsapp.com': 'neutral',
  'signal.org': 'neutral',
  'line.me': 'neutral',

  // News (general — not explicitly distraction)
  'bbc.com': 'neutral',
  'reuters.com': 'neutral',
  'apnews.com': 'neutral',
  'theguardian.com': 'neutral',
  'nytimes.com': 'neutral',
  'wsj.com': 'neutral',
  'ft.com': 'neutral',
  'bloomberg.com': 'neutral',
  'economist.com': 'neutral',
  'techcrunch.com': 'neutral',
  'theverge.com': 'neutral',
  'wired.com': 'neutral',
  'arstechnica.com': 'neutral',

  // Job search
  'linkedin.com': 'neutral',
  'indeed.com': 'neutral',
  'glassdoor.com': 'neutral',
  'levels.fyi': 'neutral',
  '104.com.tw': 'neutral',
  '1111.com.tw': 'neutral',
  'cakeresume.com': 'neutral',
}

// Helpers to get all domains per category
export function getProductiveDomains(): string[] {
  return Object.entries(DEFAULT_CATEGORIES)
    .filter(([, v]) => v === 'productive')
    .map(([k]) => k)
}

export function getDistractionDomains(): string[] {
  return Object.entries(DEFAULT_CATEGORIES)
    .filter(([, v]) => v === 'distraction')
    .map(([k]) => k)
}

export function getNeutralDomains(): string[] {
  return Object.entries(DEFAULT_CATEGORIES)
    .filter(([, v]) => v === 'neutral')
    .map(([k]) => k)
}
