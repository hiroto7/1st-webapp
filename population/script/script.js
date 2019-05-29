let map;

document.addEventListener('DOMContentLoaded', () => {
  initMap();

  for (const select of document.getElementsByTagName('select')) {
    // Selectタグの変化
    select.addEventListener('change', async e => {
      if (document.getElementById('query1').value !== '-年齢を選択-' &&
        document.getElementById('query2').value !== '-国籍を選択-') {
        const endpoint = 'http://data.e-stat.go.jp/lod/sparql/alldata/query';
        const sparql = `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix estat-measure: <http://data.e-stat.go.jp/lod/ontology/measure/>
prefix cd-dimension: <http://data.e-stat.go.jp/lod/ontology/crossDomain/dimension/>
prefix cd-code: <http://data.e-stat.go.jp/lod/ontology/crossDomain/code/>
PREFIX sdmx-dimension: <http://purl.org/linked-data/sdmx/2009/dimension#>
prefix sacs: <http://data.e-stat.go.jp/lod/terms/sacs#>
prefix estat-attribute: <http://data.e-stat.go.jp/lod/ontology/attribute/>
prefix estat-attribute-code: <http://data.e-stat.go.jp/lod/ontology/attribute/code/>
prefix g00200521-dimension-2010: <http://data.e-stat.go.jp/lod/ontology/g00200521/dimension/2010/>
prefix g00200521-code-2010: <http://data.e-stat.go.jp/lod/ontology/g00200521/code/2010/> 


SELECT distinct *
WHERE {
  ?s estat-measure:population ?o ;
    cd-dimension:sex cd-code:sex-all ;
    cd-dimension:age ${document.getElementById('query1').value} ;
    cd-dimension:timePeriod "2015"^^xsd:gYear ;
    cd-dimension:nationality ${document.getElementById('query2').value} ;
    sdmx-dimension:refArea ?refArea ;
    estat-attribute:unitMult estat-attribute-code:unitMult-0 ;
    g00200521-dimension-2010:area g00200521-code-2010:area-all .

  ?refArea rdfs:label ?refAreaLabel ;
          sacs:administrativeClass sacs:Prefecture .
  filter(LANG(?refAreaLabel) = 'ja')
} order by ?refArea limit 100`;

        const response = await fetch(`${endpoint}?query=${encodeURIComponent(sparql)}`, { headers: { Accept: 'application/sparql-results+json' } });
        const text = await response.text();
        const json = JSON.parse(text);

        render(json);
      }
    });
  }
});

// Mapへのマーカー描画
const render = json => {
  // initMap();
  const dict = {};
  for (const binding of json.results.bindings) {
    dict[binding.refAreaLabel.value] = binding.o.value;
  }
  for (const v of latlnglist.marker) {
    const pref = v.pref;
    const lat = v.lat;
    const lng = v.lng;
    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup("<span>" + pref + ": " + dict[pref] + "</span>").openPopup();
  }
}

// Mapの初期化
const initMap = () => {
  map = L.map('gmap').setView([35.619, 139.751], 8);

  // 地理院地図レイヤー追加
  L.tileLayer(
    // 地理院地図利用
    'http://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
    {
      attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
    }
  ).addTo(map);
}
