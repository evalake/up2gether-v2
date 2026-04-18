import { LegalLayout } from './LegalLayout'
import { useT } from '@/i18n'

export function PrivacyPage() {
  const t = useT()
  const toc = [
    { id: 's1', label: t.privacy.toc1 },
    { id: 's2', label: t.privacy.toc2 },
    { id: 's3', label: t.privacy.toc3 },
    { id: 's4', label: t.privacy.toc4 },
    { id: 's5', label: t.privacy.toc5 },
    { id: 's6', label: t.privacy.toc6 },
    { id: 's7', label: t.privacy.toc7 },
    { id: 's8', label: t.privacy.toc8 },
    { id: 's9', label: t.privacy.toc9 },
    { id: 's10', label: t.privacy.toc10 },
    { id: 's11', label: t.privacy.toc11 },
    { id: 's12', label: t.privacy.toc12 },
    { id: 's13', label: t.privacy.toc13 },
  ]

  return (
    <LegalLayout
      title={t.privacy.title}
      effectiveAt={t.privacy.effectiveAt}
      updatedAt={t.privacy.updatedAt}
      toc={toc}
      summary={
        <>
          <p>{t.privacy.summaryIntro}</p>
          <ul>
            <li>
              {t.privacy.summaryOauth}
              <strong>{t.privacy.summaryOauthBold}</strong>
              {t.privacy.summaryOauthEnd}
            </li>
            <li>{t.privacy.summarySteam}</li>
            <li>{t.privacy.summaryNoSell}</li>
            <li>{t.privacy.summaryExport}</li>
          </ul>
        </>
      }
    >
      <section id="s1">
        <h2>{t.privacy.s1title}</h2>
        <p>
          {t.privacy.s1p1}
          <strong>{t.privacy.s1p1bold}</strong>
          {t.privacy.s1p1end}
        </p>
        <p>
          {t.privacy.s1p2pre}
          <code>{t.privacy.s1p2code}</code>
          {t.privacy.s1p2end}
        </p>
      </section>

      <section id="s2">
        <h2>{t.privacy.s2title}</h2>
        <p>{t.privacy.s2intro}</p>
        <ul>
          <li>
            <strong>{t.privacy.s2service}</strong>
            {t.privacy.s2serviceDesc}
          </li>
          <li>
            <strong>{t.privacy.s2user}</strong>
            {t.privacy.s2userDesc}
          </li>
          <li>
            <strong>{t.privacy.s2group}</strong>
            {t.privacy.s2groupDesc}
          </li>
          <li>
            <strong>{t.privacy.s2admin}</strong>
            {t.privacy.s2adminDesc}
          </li>
          <li>
            <strong>{t.privacy.s2data}</strong>
            {t.privacy.s2dataDesc}
          </li>
        </ul>
      </section>

      <section id="s3">
        <h2>{t.privacy.s3title}</h2>

        <h3>{t.privacy.s3_1title}</h3>
        <p>{t.privacy.s3_1intro}</p>
        <table>
          <thead>
            <tr>
              <th>{t.privacy.s3_1thField}</th>
              <th>{t.privacy.s3_1thPurpose}</th>
              <th>{t.privacy.s3_1thOrigin}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t.privacy.s3_1discordId}</td>
              <td>{t.privacy.s3_1discordIdPurpose}</td>
              <td>{t.privacy.s3_1discordIdOrigin}</td>
            </tr>
            <tr>
              <td>{t.privacy.s3_1username}</td>
              <td>{t.privacy.s3_1usernamePurpose}</td>
              <td>{t.privacy.s3_1usernameOrigin}</td>
            </tr>
            <tr>
              <td>{t.privacy.s3_1avatar}</td>
              <td>{t.privacy.s3_1avatarPurpose}</td>
              <td>{t.privacy.s3_1avatarOrigin}</td>
            </tr>
            <tr>
              <td>{t.privacy.s3_1guilds}</td>
              <td>{t.privacy.s3_1guildsPurpose}</td>
              <td>{t.privacy.s3_1guildsOrigin}</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>{t.privacy.s3_1notReceive}</strong>
          {t.privacy.s3_1notReceiveEnd}
        </p>

        <h3>{t.privacy.s3_2title}</h3>
        <p>{t.privacy.s3_2body}</p>

        <h3>{t.privacy.s3_3title}</h3>
        <p>{t.privacy.s3_3body}</p>

        <h3>{t.privacy.s3_4title}</h3>
        <p>
          {t.privacy.s3_4body1}
          <strong>{t.privacy.s3_4bold}</strong>
          {t.privacy.s3_4body2}
        </p>
      </section>

      <section id="s4">
        <h2>{t.privacy.s4title}</h2>
        <p>{t.privacy.s4intro}</p>
        <table>
          <thead>
            <tr>
              <th>{t.privacy.s4thData}</th>
              <th>{t.privacy.s4thBasis}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t.privacy.s4row1data}</td>
              <td>{t.privacy.s4row1basis}</td>
            </tr>
            <tr>
              <td>{t.privacy.s4row2data}</td>
              <td>{t.privacy.s4row2basis}</td>
            </tr>
            <tr>
              <td>{t.privacy.s4row3data}</td>
              <td>{t.privacy.s4row3basis}</td>
            </tr>
            <tr>
              <td>{t.privacy.s4row4data}</td>
              <td>{t.privacy.s4row4basis}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="s5">
        <h2>{t.privacy.s5title}</h2>
        <p>
          <strong>{t.privacy.s5intro1}</strong>
          {t.privacy.s5intro2}
        </p>
        <table>
          <thead>
            <tr>
              <th>{t.privacy.s5thOperator}</th>
              <th>{t.privacy.s5thFunction}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t.privacy.s5discord}</td>
              <td>{t.privacy.s5discordFn}</td>
            </tr>
            <tr>
              <td>{t.privacy.s5valve}</td>
              <td>{t.privacy.s5valveFn}</td>
            </tr>
            <tr>
              <td>{t.privacy.s5vercel}</td>
              <td>{t.privacy.s5vercelFn}</td>
            </tr>
            <tr>
              <td>{t.privacy.s5fly}</td>
              <td>{t.privacy.s5flyFn}</td>
            </tr>
            <tr>
              <td>{t.privacy.s5neon}</td>
              <td>{t.privacy.s5neonFn}</td>
            </tr>
            <tr>
              <td>{t.privacy.s5cf}</td>
              <td>{t.privacy.s5cfFn}</td>
            </tr>
          </tbody>
        </table>
        <p>{t.privacy.s5outro}</p>
      </section>

      <section id="s6">
        <h2>{t.privacy.s6title}</h2>
        <p>{t.privacy.s6body}</p>
      </section>

      <section id="s7">
        <h2>{t.privacy.s7title}</h2>
        <table>
          <thead>
            <tr>
              <th>{t.privacy.s7thCategory}</th>
              <th>{t.privacy.s7thRetention}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t.privacy.s7row1cat}</td>
              <td>{t.privacy.s7row1ret}</td>
            </tr>
            <tr>
              <td>{t.privacy.s7row2cat}</td>
              <td>{t.privacy.s7row2ret}</td>
            </tr>
            <tr>
              <td>{t.privacy.s7row3cat}</td>
              <td>{t.privacy.s7row3ret}</td>
            </tr>
            <tr>
              <td>{t.privacy.s7row4cat}</td>
              <td>{t.privacy.s7row4ret}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="s8">
        <h2>{t.privacy.s8title}</h2>
        <p>{t.privacy.s8intro}</p>
        <ul>
          <li>{t.privacy.s8r1}</li>
          <li>{t.privacy.s8r2}</li>
          <li>{t.privacy.s8r3}</li>
          <li>{t.privacy.s8r4}</li>
          <li>{t.privacy.s8r5}</li>
          <li>{t.privacy.s8r6}</li>
          <li>
            {t.privacy.s8r7pre}
            <strong>{t.privacy.s8r7bold}</strong>
            {t.privacy.s8r7post}
          </li>
        </ul>
        <p>
          {t.privacy.s8outro1}
          <code>{t.privacy.s8outroCode}</code>
          {t.privacy.s8outro2}
          <strong>{t.privacy.s8outroBold}</strong>
          {t.privacy.s8outro3}
        </p>
      </section>

      <section id="s9">
        <h2>{t.privacy.s9title}</h2>
        <p>{t.privacy.s9p1}</p>
        <p>{t.privacy.s9p2}</p>
      </section>

      <section id="s10">
        <h2>{t.privacy.s10title}</h2>
        <p>{t.privacy.s10body}</p>
      </section>

      <section id="s11">
        <h2>{t.privacy.s11title}</h2>
        <p>{t.privacy.s11body}</p>
      </section>

      <section id="s12">
        <h2>{t.privacy.s12title}</h2>
        <p>
          {t.privacy.s12body1}
          <strong>{t.privacy.s12bold}</strong>
          {t.privacy.s12body2}
        </p>
      </section>

      <section id="s13">
        <h2>{t.privacy.s13title}</h2>
        <p>
          {t.privacy.s13body1}
          <a href="mailto:contato@up2gether.com.br">contato@up2gether.com.br</a>
          {t.privacy.s13body2}
          <code>{t.privacy.s13code}</code>
          {t.privacy.s13body3}
          <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">
            {t.privacy.s13anpdUrl}
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  )
}
