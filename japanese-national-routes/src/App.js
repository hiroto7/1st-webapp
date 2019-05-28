// @ts-check
import React from 'react';
import './App.css';
import Arrow from './Arrow';

/** @typedef {{ number: number; start: string[]; end: string[]; length: number | null }} Route */

/** @extends {React.Component<{}, { current: Route | null, currentRouteNumber: number | '', error: object | null, info: object | null }>} */
class App extends React.Component {
  /** @type {{ current: Route | null, currentRouteNumber: number | '', error: object | null, info: object | null }} */
  state = { currentRouteNumber: '', current: null, error: null, info: null };

  /** @param {number} number */
  async changeRouteTo(number) {
    const endpoint = 'http://www.ohsuga.is.uec.ac.jp/sparql';
    const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dbpedia-ja: <http://ja.dbpedia.org/resource/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>

select distinct * where {
  dbpedia-ja:国道${number}号
    dbpedia-owl:routeStart ?routeStart ;
    dbpedia-owl:routeEnd ?routeEnd .
  optional {
    dbpedia-ja:国道${number}号 dbpedia-owl:length ?length .
  }
  ?routeStart rdfs:label ?routeStartLabel.
  ?routeEnd rdfs:label ?routeEndLabel .
}
`;

    try {
      this.setState({
        current: null,
        error: null,
        info: '問い合わせ中...'
      })
      const response = await fetch(`${endpoint}?query=${encodeURIComponent(query)}`, {
        headers: {
          Accept: 'application/sparql-results+json'
        }
      });
      const text = await response.text();
      /** @type { { results: { bindings: [{ routeStartLabel: { value: string }, routeEndLabel: { value: string }, length: { value: number } }] } }} */
      const json = JSON.parse(text);
      if (json.results.bindings.length < 1) {
        throw new Error(`'国道${number}号' は取得できません。`)
      }
      this.setState({
        current: {
          number,
          start: [...new Set(json.results.bindings.map(binding => binding.routeStartLabel.value))],
          end: [...new Set(json.results.bindings.map(binding => binding.routeEndLabel.value))],
          length: json.results.bindings[0].length === undefined ? null : json.results.bindings[0].length.value
        },
        error: null,
        info: json.results.bindings[0].length === undefined ? `'国道${number}号' の長さは取得できません。` : null
      })
    } catch (e) {
      this.setState({
        current: null,
        error: e,
        info: null
      });
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
        {
          this.state.info === null ? '' : (
            <div style={{ color: 'rgba(255, 255, 255, .5)' }}>{this.state.info.toString()}</div>
          )
        }
        {
          this.state.error === null ? '' : (
            <div style={{ color: 'red' }}>{this.state.error.toString()}</div>
          )
        }
        {
          this.state.current === null ? '' : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2em' }}>
              <ul style={{ textAlign: 'right' }}>{this.state.current.start.map(str => (<li>{str}</li>))}</ul>
              <div style={{ margin: '0 1em' }}>
                {this.state.current.length === null ? (
                  <div>{'-'.repeat(8)}</div>
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
                  )}
              </div>
              <ul style={{ textAlign: 'left' }}>{this.state.current.end.map(str => (<li>{str}</li>))}</ul>
            </div>
          )
        }
      </div>
    );
  }
}

export default App;
