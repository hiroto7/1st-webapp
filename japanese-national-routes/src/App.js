// @ts-check
import React from 'react';
import './App.css';
import Arrow from './Arrow';
import NoticeBox from './NoticeBox';

/** @typedef {{ number: number; starts: Set<string>; ends: Set<string>; length: number | null }} Route */
/** @typedef {import('./NoticeBox').Notice} Notice */
/** @typedef {{ results: { bindings: [{ routeStart?: { value: string }, routeStartLabel?: { value: string }, routeEnd?: { value: string }, routeEndLabel?: { value: string }, length?: { value: string }, routeNumber?: { value: string } }] } }} JSON1 */

/** @extends {React.Component<{}, { current: Route | null, others: Route[], currentRouteNumber: number | '', notices: Notice[] }>} */
class App extends React.Component {
  /** @type {{ current: Route | null, others: Route[], currentRouteNumber: number | '', notices: Notice[] }} */
  state = { currentRouteNumber: '', others: [], current: null, notices: [] };

  /** @param {number} routeNumber */
  async changeRouteTo(routeNumber) {
    /** @type {Notice[]} */
    let notices = [];

    try {
      const endpoint = 'http://www.ohsuga.is.uec.ac.jp/sparql';
      const query = `PREFIX dbr: <http://dbpedia.org/resource/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dbpedia-ja: <http://ja.dbpedia.org/resource/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>

select distinct * where {
  optional {
    dbpedia-ja:国道${routeNumber}号 dbpedia-owl:routeStart ?routeStart .
    ?routeStart rdfs:label ?routeStartLabel.
  }
  optional {
    dbpedia-ja:国道${routeNumber}号 dbpedia-owl:routeEnd ?routeEnd .
    ?routeEnd rdfs:label ?routeEndLabel .
  }
  optional {
    dbpedia-ja:国道${routeNumber}号 dbpedia-owl:length ?length .
  }
}
`;

      this.setState({
        current: null,
        others: [],
        currentRouteNumber: routeNumber,
        notices: [...notices, { message: `'国道${routeNumber}号' を問い合わせ中...`, type: 'info' }]
      })

      const response = await fetch(`${endpoint}?query=${encodeURIComponent(query)}`, { headers: { Accept: 'application/sparql-results+json' } });
      const text = await response.text();
      /** @type {JSON1} */
      const json = JSON.parse(text);

      /** @type {Set<string>} */
      const starts = new Set();
      /** @type {Set<string>} */
      const ends = new Set();
      /** @type {Set<string>} */
      const startLabels = new Set();
      /** @type {Set<string>} */
      const endLabels = new Set();
      /** @type {number | null} */
      let length = null;

      for (const binding of json.results.bindings) {
        if (binding.routeStart !== undefined)
          starts.add(binding.routeStart.value);

        if (binding.routeEnd !== undefined)
          ends.add(binding.routeEnd.value);

        if (binding.routeStartLabel !== undefined)
          startLabels.add(binding.routeStartLabel.value);

        if (binding.routeEndLabel !== undefined)
          endLabels.add(binding.routeEndLabel.value);

        if (binding.length !== undefined) length = +binding.length.value;
      }

      if (startLabels.size < 1 && endLabels.size < 1 && length === null)
        throw new Error(`'国道${routeNumber}号' を取得できません。`)

      if (startLabels.size < 1 || endLabels.size < 1 || length === null)
        notices = [...notices, {
          message: `'国道${routeNumber}号' の${
            startLabels.size < 1 ?
              endLabels.size < 1 ?
                '起終点' :
                length === null ?
                  '起点と長さ' :
                  '起点' :
              endLabels.size < 1 ?
                length === null ?
                  '終点と長さ' :
                  '終点' :
                '長さ'
            }を取得できません。`,
          type: 'warn'
        }];

      if (routeNumber !== this.state.currentRouteNumber)
        return;

      this.setState({
        current: { number: routeNumber, starts: startLabels, ends: endLabels, length },
        notices: [...notices, { message: `'国道${routeNumber}号' に起終点が一致する国道を問い合わせ中...`, type: 'info' }]
      });

      const query2 = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dbpedia-ja: <http://ja.dbpedia.org/resource/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX category-ja: <http://ja.dbpedia.org/resource/Category:>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 

select distinct * where {
  ?route dcterms:subject category-ja:一般国道 ;
    rdfs:label ?routeLabel .
  optional {
    ?route dbpedia-owl:routeStart ?routeStart .
    ?routeStart rdfs:label ?routeStartLabel .
  }
  optional {
    ?route dbpedia-owl:routeEnd ?routeEnd .
    ?routeEnd rdfs:label ?routeEndLabel .
  }
  optional {
    ?route dbpedia-owl:length ?length .
  }
  ${[...new Set([...starts, ...ends])].map(point => `{
    ?route dbpedia-owl:routeStart <${point}> .
  } union {
    ?route dbpedia-owl:routeEnd <${point}> .
  }`).join(' union ')}
  filter(regex(?routeLabel, "^国道[0-9]号$|^国道[0-9][0-9]号$|^国道[0-9][0-9][0-9]号$")) .
  bind(xsd:integer(replace(replace(?routeLabel, "国道", ""), "号", "")) as ?routeNumber) .
} order by ?routeNumber`;

console.log(query2)

      const response2 = await fetch(`${endpoint}?query=${encodeURIComponent(query2)}`, { headers: { Accept: 'application/sparql-results+json' } });
      const text2 = await response2.text();
      /** @type {JSON1} */
      const json2 = JSON.parse(text2);

      /** @type {Map<number, Route>} */
      const map = new Map();

      for (const binding of json2.results.bindings) {
        if (binding.routeNumber === undefined)
          throw new Error();

        if (+binding.routeNumber.value === routeNumber)
          continue;

        const route = map.get(+binding.routeNumber.value) ||
          { number: +binding.routeNumber.value, starts: new Set(), ends: new Set(), length: null };
        map.set(+binding.routeNumber.value, route);

        if (binding.routeStartLabel !== undefined)
          route.starts.add(binding.routeStartLabel.value);

        if (binding.routeEndLabel !== undefined)
          route.ends.add(binding.routeEndLabel.value);

        if (binding.length !== undefined)
          route.length = +binding.length.value;
      }

      this.setState({ others: [...map.values()], notices });
    } catch (e) {
      if (routeNumber === this.state.currentRouteNumber)
        this.setState({
          notices: [...notices, { type: 'error', message: e.toString() }]
        });
    }
  }

  render() {
    return (
      <div className="App">
        <div style={{ margin: '64px 0', fontSize: '2em', fontWeight: 'bold' }}>
          国道
          <input type="number" autoFocus min={1} max={999} value={this.state.currentRouteNumber}
            onChange={e => this.changeRouteTo(+e.target.value)}></input>
          号
        </div>
        <ul>{this.state.notices.map(notice => (<li><NoticeBox notice={notice} /></li>))}</ul>
        {
          this.state.current === null ? '' : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2em' }}>
              <div style={{ textAlign: 'right' }}>{
                this.state.current.starts.size < 1 ? '?' : (
                  <ul>{[...this.state.current.starts].map(str => (<li>{str}</li>))}</ul>
                )
              }</div>
              <div style={{ margin: '0 1em' }}>{
                this.state.current.length === null ? (
                  <div>-&gt;</div>
                ) : (
                    <div>
                      <div>{
                        this.state.current.length < 1000 ?
                          `${this.state.current.length}m` :
                          `${this.state.current.length / 1000}km`
                      }</div>
                      <div>
                        <Arrow length={this.state.current.length / 20000} />
                      </div>
                    </div>
                  )
              }</div>
              <div style={{ textAlign: 'left' }}>{
                this.state.current.ends.size < 1 ? '?' : (
                  <ul>{[...this.state.current.ends].map(str => (<li>{str}</li>))}</ul>
                )
              }</div>
            </div>
          )
        }
        {
          this.state.others === null || this.state.others.length < 1 ? '' :
            <table style={{ margin: '64px auto' }}>
              <caption style={{ fontWeight: 'bold' }}>起終点が一致する国道</caption>
              <tbody>
                {this.state.others.map(other => (
                  <tr onClick={() => this.changeRouteTo(other.number)} style={{
                    color: (
                      [...other.starts].some(start => this.state.current !== null && this.state.current.starts.has(start)) &&
                      [...other.ends].some(end => this.state.current !== null && this.state.current.ends.has(end))
                    ) || (
                        [...other.starts].some(start => this.state.current !== null && this.state.current.ends.has(start)) &&
                        [...other.ends].some(end => this.state.current !== null && this.state.current.starts.has(end))
                      ) ? 'lightgreen' : 'inherit'
                  }}>
                    <td style={{ textAlign: 'left', fontWeight: 'bold' }}>国道{other.number}号</td>
                    <td style={{ textAlign: 'right' }}>{
                      other.starts.size < 1 ? '?' : (
                        <ul>{[...other.starts].map(start => (<li style={{
                          textDecoration:
                            this.state.current !== null && (this.state.current.starts.has(start) || this.state.current.ends.has(start)) ?
                              'underline' : 'none'
                        }}>{start}</li>))}</ul>
                      )
                    }</td>
                    <td style={{ color: 'rgba(255, 255, 255, .5)' }}>-&gt;</td>
                    <td style={{ textAlign: 'left' }}>{
                      other.ends.size < 1 ? '?' : (
                        <ul>{[...other.ends].map(end => (<li style={{
                          textDecoration:
                            this.state.current !== null && (this.state.current.starts.has(end) || this.state.current.ends.has(end)) ?
                              'underline' : 'none'
                        }}>{end}</li>))}</ul>
                      )
                    }</td>
                    <td style={{ textAlign: 'right' }}>{
                      other.length === null ? '-' : other.length < 1000 ?
                        `${other.length}m` :
                        `${other.length / 1000}km`
                    }</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    );
  }
}

export default App;
