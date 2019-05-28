// @ts-check
import React from 'react';
import './App.css';
import Arrow from './Arrow';
import NoticeBox from './NoticeBox';

/** @typedef {{ number: number; start: string[]; end: string[]; length: number | null }} Route */
/** @typedef {import('./NoticeBox').Notice} Notice */

/** @extends {React.Component<{}, { current: Route | null, currentRouteNumber: number | '', notice: Notice | null }>} */
class App extends React.Component {
  /** @type {{ current: Route | null, currentRouteNumber: number | '', notice: Notice | null }} */
  state = { currentRouteNumber: '', current: null, notice: null };

  /** @param {number} number */
  async changeRouteTo(number) {
    const endpoint = 'http://www.ohsuga.is.uec.ac.jp/sparql';
    const query = `PREFIX dbr: <http://dbpedia.org/resource/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dbpedia-ja: <http://ja.dbpedia.org/resource/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>

select distinct * where {
  optional {
    dbpedia-ja:国道${number}号 dbpedia-owl:routeStart ?routeStart .
    ?routeStart rdfs:label ?routeStartLabel.
  }
  optional {
    dbpedia-ja:国道${number}号 dbpedia-owl:routeEnd ?routeEnd .
    ?routeEnd rdfs:label ?routeEndLabel .
  }
  optional {
    dbpedia-ja:国道${number}号 dbpedia-owl:length ?length .
  }
}
`;

    this.setState({
      current: null,
      notice: { message: `'国道${number}号' を問い合わせ中...`, type: 'info' }
    })

    try {
      const response = await fetch(`${endpoint}?query=${encodeURIComponent(query)}`, {
        headers: {
          Accept: 'application/sparql-results+json'
        }
      });
      const text = await response.text();
      /** @type { { results: { bindings: [{ routeStartLabel: { value: string }, routeEndLabel: { value: string }, length: { value: number } }] } }} */
      const json = JSON.parse(text);

      const start = [...new Set(json.results.bindings.filter(binding => 'routeStartLabel' in binding).map(binding => binding.routeStartLabel.value))];
      const end = [...new Set(json.results.bindings.filter(binding => 'routeEndLabel' in binding).map(binding => binding.routeEndLabel.value))];
      const length = json.results.bindings[0].length === undefined ? null : json.results.bindings[0].length.value

      if (start.length < 1 && end.length < 1 && length === null) {
        throw new Error(`'国道${number}号' を取得できません。`)
      }
      if (number === this.state.currentRouteNumber) {
        this.setState({
          current: { number, start, end, length },
          notice: start.length < 1 || end.length < 1 || length === null ? {
            message: `'国道${number}号' の${
              start.length < 1 ?
                end.length < 1 ?
                  '起終点' :
                  length === null ?
                    '起点と長さ' :
                    '起点' :
                end.length < 1 ?
                  length === null ?
                    '終点と長さ' :
                    '終点' :
                  '長さ'
              }を取得できません。`,
            type: 'warn'
          } : null
        });
      }
    } catch (e) {
      if (number === this.state.currentRouteNumber) {
        this.setState({
          notice: { type: 'error', message: e.toString() }
        });
      }
    }
  }

  render() {
    return (
      <div className="App">
        <div style={{ padding: '64px 0', fontSize: '2em', fontWeight: 'bold' }}>
          国道
          <input type="number" autoFocus min={1} max={999} value={this.state.currentRouteNumber}
            onChange={e => {
              const value = +e.target.value;
              this.setState({ currentRouteNumber: value });
              this.changeRouteTo(value)
            }}></input>
          号
        </div>
        {this.state.notice === null ? '' : (<NoticeBox notice={this.state.notice} />)}
        {
          this.state.current === null ? '' : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2em' }}>
              {
                this.state.current.start.length < 1 ? (
                  <div>?</div>
                ) : (
                    <ul style={{ textAlign: 'right' }}>
                      {this.state.current.start.map(str => (<li>{str}</li>))}
                    </ul>
                  )
              }
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
              {
                this.state.current.end.length < 1 ? (
                  <div>?</div>
                ) : (
                    <ul style={{ textAlign: 'left' }}>{
                      this.state.current.end.map(str => (<li>{str}</li>))
                    }</ul>
                  )
              }
            </div>
          )
        }
      </div>
    );
  }
}

export default App;
