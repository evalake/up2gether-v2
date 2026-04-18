import { LegalLayout } from './LegalLayout'
import { useT } from '@/i18n'

export function TermsPage() {
  const t = useT()
  const toc = [
    { id: 's1', label: t.terms.toc1 },
    { id: 's2', label: t.terms.toc2 },
    { id: 's3', label: t.terms.toc3 },
    { id: 's4', label: t.terms.toc4 },
    { id: 's5', label: t.terms.toc5 },
    { id: 's6', label: t.terms.toc6 },
    { id: 's7', label: t.terms.toc7 },
    { id: 's8', label: t.terms.toc8 },
    { id: 's9', label: t.terms.toc9 },
    { id: 's10', label: t.terms.toc10 },
    { id: 's11', label: t.terms.toc11 },
    { id: 's12', label: t.terms.toc12 },
    { id: 's13', label: t.terms.toc13 },
    { id: 's14', label: t.terms.toc14 },
  ]

  return (
    <LegalLayout
      title={t.terms.title}
      effectiveAt={t.terms.effectiveAt}
      updatedAt={t.terms.updatedAt}
      toc={toc}
      summary={
        <>
          <p>{t.terms.summaryIntro}</p>
          <ul>
            <li>{t.terms.summaryAccess}</li>
            <li>{t.terms.summaryBeta}</li>
            <li>{t.terms.summaryContent}</li>
            <li>{t.terms.summaryAbuse}</li>
            <li>{t.terms.summaryTerminate}</li>
          </ul>
        </>
      }
    >
      <section id="s1">
        <h2>{t.terms.s1title}</h2>
        <p>{t.terms.s1p1}</p>
        <p>
          {t.terms.s1p2pre}
          <a href="/privacy">{t.terms.s1p2link}</a>
          {t.terms.s1p2post}
        </p>
      </section>

      <section id="s2">
        <h2>{t.terms.s2title}</h2>
        <ul>
          <li>
            <strong>{t.terms.s2service}</strong>
            {t.terms.s2serviceDesc}
          </li>
          <li>
            <strong>{t.terms.s2user}</strong>
            {t.terms.s2userDesc}
          </li>
          <li>
            <strong>{t.terms.s2group}</strong>
            {t.terms.s2groupDesc}
          </li>
          <li>
            <strong>{t.terms.s2admin}</strong>
            {t.terms.s2adminDesc}
          </li>
          <li>
            <strong>{t.terms.s2content}</strong>
            {t.terms.s2contentDesc}
          </li>
        </ul>
      </section>

      <section id="s3">
        <h2>{t.terms.s3title}</h2>
        <p>{t.terms.s3p1}</p>
        <p>
          {t.terms.s3p2pre}
          <strong>{t.terms.s3p2bold1}</strong>
          {t.terms.s3p2mid}
          <strong>{t.terms.s3p2bold2}</strong>
          {t.terms.s3p2post}
        </p>
      </section>

      <section id="s4">
        <h2>{t.terms.s4title}</h2>
        <ul>
          <li>{t.terms.s4r1}</li>
          <li>{t.terms.s4r2}</li>
          <li>{t.terms.s4r3}</li>
          <li>{t.terms.s4r4}</li>
        </ul>
      </section>

      <section id="s5">
        <h2>{t.terms.s5title}</h2>
        <p>
          {t.terms.s5intro}
          <strong>{t.terms.s5introBold}</strong>
          {t.terms.s5introPost}
        </p>
        <ul>
          <li>{t.terms.s5r1}</li>
          <li>{t.terms.s5r2}</li>
          <li>{t.terms.s5r3}</li>
          <li>{t.terms.s5r4}</li>
          <li>{t.terms.s5r5}</li>
          <li>{t.terms.s5r6}</li>
        </ul>
        <p>{t.terms.s5outro}</p>
      </section>

      <section id="s6">
        <h2>{t.terms.s6title}</h2>
        <p>
          {t.terms.s6p1pre}
          <strong>{t.terms.s6p1bold}</strong>
          {t.terms.s6p1post}
        </p>
        <p>{t.terms.s6p2}</p>
      </section>

      <section id="s7">
        <h2>{t.terms.s7title}</h2>
        <p>{t.terms.s7body}</p>
      </section>

      <section id="s8">
        <h2>{t.terms.s8title}</h2>
        <p>{t.terms.s8intro}</p>
        <ul>
          <li>{t.terms.s8r1}</li>
          <li>
            {t.terms.s8r2pre}
            <strong>{t.terms.s8r2bold1}</strong>
            {t.terms.s8r2mid}
            <strong>{t.terms.s8r2bold2}</strong>
            {t.terms.s8r2post}
          </li>
          <li>
            {t.terms.s8r3pre}
            <strong>{t.terms.s8r3bold}</strong>
            {t.terms.s8r3post}
          </li>
          <li>{t.terms.s8r4}</li>
          <li>
            {t.terms.s8r5pre}
            <strong>{t.terms.s8r5bold}</strong>
            {t.terms.s8r5post}
          </li>
        </ul>
      </section>

      <section id="s9">
        <h2>{t.terms.s9title}</h2>
        <p>{t.terms.s9p1}</p>
        <p>
          {t.terms.s9p2pre}
          <strong>{t.terms.s9p2bold}</strong>
          {t.terms.s9p2post}
        </p>
      </section>

      <section id="s10">
        <h2>{t.terms.s10title}</h2>
        <p>
          {t.terms.s10p1pre}
          <code>{t.terms.s10p1code}</code>
          {t.terms.s10p1post}
        </p>
        <p>{t.terms.s10p2}</p>
      </section>

      <section id="s11">
        <h2>{t.terms.s11title}</h2>
        <p>{t.terms.s11intro}</p>
        <ul>
          <li>{t.terms.s11r1}</li>
          <li>{t.terms.s11r2}</li>
          <li>{t.terms.s11r3}</li>
        </ul>
        <p>{t.terms.s11outro}</p>
      </section>

      <section id="s12">
        <h2>{t.terms.s12title}</h2>
        <p>
          {t.terms.s12body1}
          <strong>{t.terms.s12bold}</strong>
          {t.terms.s12body2}
        </p>
      </section>

      <section id="s13">
        <h2>{t.terms.s13title}</h2>
        <p>{t.terms.s13body}</p>
      </section>

      <section id="s14">
        <h2>{t.terms.s14title}</h2>
        <p>
          {t.terms.s14body1}
          <a href="mailto:contato@up2gether.com.br">contato@up2gether.com.br</a>
          {t.terms.s14body2}
          <a href="/contact">{t.terms.s14link}</a>
          {t.terms.s14body3}
        </p>
      </section>
    </LegalLayout>
  )
}
