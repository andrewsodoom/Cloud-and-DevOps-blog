const test = require('node:test')
const assert = require('node:assert/strict')

const {
  parseRssXml,
  parseLinkedInHtml,
  stripDuplicateImages,
} = require('../utils/externalFeeds')

const rssSource = {
  id: 'sample',
  name: 'Sample Feed',
  homepage: 'https://example.com',
}

const linkedinSource = {
  id: 'linkedin',
  name: 'LinkedIn Engineering',
  homepage: 'https://www.linkedin.com/blog/engineering',
}

test('parseRssXml reads RSS items, CDATA, authors, tags, and dates', () => {
  const xml = `<rss><channel>
    <item>
      <title><![CDATA[Hello &amp; welcome]]></title>
      <link>https://example.com/a</link>
      <pubDate>Mon, 19 Oct 2026 11:00:00 +0000</pubDate>
      <dc:creator><![CDATA[Ada Lovelace]]></dc:creator>
      <description><![CDATA[<p>Short <b>summary</b>.</p><img src="https://example.com/a.jpg">]]></description>
      <category><![CDATA[DevOps]]></category>
    </item>
  </channel></rss>`

  const articles = parseRssXml(xml, rssSource)

  assert.equal(articles.length, 1)
  assert.equal(articles[0].title, 'Hello & welcome')
  assert.equal(articles[0].url, 'https://example.com/a')
  assert.equal(articles[0].author, 'Ada Lovelace')
  assert.equal(articles[0].excerpt, 'Short summary.')
  assert.equal(articles[0].publishedAt, '2026-10-19T11:00:00.000Z')
  assert.deepEqual(articles[0].tags, ['DevOps'])
  assert.equal(articles[0].image, 'https://example.com/a.jpg')
  assert.equal(articles[0].source.name, 'Sample Feed')
  assert.match(articles[0].id, /^sample-[0-9a-f]{16}$/)
  assert.match(
    articles[0].content,
    /<p>Short <strong>summary<\/strong>\.<\/p><img src="https:\/\/example\.com\/a\.jpg" loading="lazy" \/>/,
  )
})

test('parseRssXml supports Atom entries with alternate links', () => {
  const xml = `<feed>
    <entry>
      <title type="html">Atom post</title>
      <link rel="alternate" href="https://example.com/b"/>
      <updated>2026-10-20T09:00:00.000Z</updated>
      <summary>Atom summary</summary>
      <author><name>Grace Hopper</name></author>
    </entry>
  </feed>`

  const articles = parseRssXml(xml, rssSource)

  assert.equal(articles.length, 1)
  assert.equal(articles[0].title, 'Atom post')
  assert.equal(articles[0].url, 'https://example.com/b')
  assert.equal(articles[0].author, 'Grace Hopper')
  assert.equal(articles[0].excerpt, 'Atom summary')
})

test('parseRssXml skips malformed items without a title or link', () => {
  const xml = `<rss><channel>
    <item><title>Missing link</title></item>
    <item><link>https://example.com/no-title</link></item>
  </channel></rss>`

  assert.deepEqual(parseRssXml(xml, rssSource), [])
})

test('parseLinkedInHtml reads the engineering blog list markup', () => {
  const html = `<ul>
    <li class="post-list__item grid-post">
      <img data-delayed-url="https://img.example/x.jpg">
      <div class="grid-post__title">
        <a class="grid-post__link t-20 t-black" href="https://www.linkedin.com/blog/engineering/infrastructure/abc">
          Scaling infrastructure
        </a>
      </div>
      <p class="grid-post__author t-14 t-bold t-black">JANE DOE</p>
      <p class="grid-post__date t-14 t-black--light">Oct 20, 2026</p>
    </li>
  </ul>`

  const articles = parseLinkedInHtml(html, linkedinSource)

  assert.equal(articles.length, 1)
  assert.equal(articles[0].title, 'Scaling infrastructure')
  assert.equal(articles[0].author, 'Jane Doe')
  assert.deepEqual(articles[0].tags, ['Infrastructure'])
  assert.equal(articles[0].image, 'https://img.example/x.jpg')
  assert.equal(articles[0].source.id, 'linkedin')
})

test('stripDuplicateImages removes the cover image from article content', () => {
  const content =
    '<p>Intro</p><img src="https://example.com/cover.jpg" alt="" />' +
    '<a href="https://example.com/cover.jpg" rel="noopener noreferrer"></a>' +
    '<p>Body</p><img src="https://example.com/diagram.png" alt="" />'

  const stripped = stripDuplicateImages(content, 'https://example.com/cover.jpg')

  assert.doesNotMatch(stripped, /cover\.jpg/)
  assert.match(stripped, /<p>Intro<\/p>/)
  assert.match(stripped, /<p>Body<\/p><img src="https:\/\/example\.com\/diagram\.png"/)
})
