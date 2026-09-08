import fs from 'node:fs';

const serverPath = 'server.ts';
const smoke16Path = 'scripts/qa/smoke-post-ux-c-hotfix-16.ps1';
const smoke161Path = 'scripts/qa/smoke-post-ux-c-hotfix-16-1.ps1';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

let server = read(serverPath);

const oldInjection = `          if (product && html.includes('</body>')) {
            const bootstrap = '    <script type="application/json" id="selfcare-server-product-bootstrap">' +
              serializePdpBootstrap(product) +
              '</script>\\n';
            html = html.replace('</body>', bootstrap + '  </body>');
          }`;

const newInjection = `          // POST-UX C HOTFIX 16.3: inject bootstrap before the client bootstrap executes.
          if (product && html.includes('</head>')) {
            const bootstrap = '    <script type="application/json" id="selfcare-server-product-bootstrap">' +
              serializePdpBootstrap(product) +
              '</script>\\n';
            html = html.replace('</head>', bootstrap + '  </head>');
          }`;

if (!server.includes('POST-UX C HOTFIX 16.3: inject bootstrap before the client bootstrap executes.')) {
  if (!server.includes(oldInjection)) {
    throw new Error('HOTFIX 16.3 server bootstrap injection anchor not found');
  }
  server = server.replace(oldInjection, newInjection);
  write(serverPath, server);
  console.log('PATCH move inert product bootstrap from end of body into head');
} else {
  console.log('SKIP HOTFIX 16.3 server bootstrap order already repaired');
}

for (const smokePath of [smoke16Path, smoke161Path]) {
  let smoke = read(smokePath);
  if (!smoke.includes('bootstrap appears before HOTFIX 11 client bootstrap')) {
    const insertAfter = `$server = Get-Content 'server.ts' -Raw
$html = Get-Content 'index.html' -Raw
`;
    if (!smoke.includes(insertAfter)) throw new Error(`HOTFIX 16.3 smoke anchor missing: ${smokePath}`);

    const added = `${insertAfter}
$serverBootstrapMarker = 'id="selfcare-server-product-bootstrap"'
$clientBootstrapMarker = "document.getElementById('selfcare-server-product-bootstrap')"

if ($server.Contains("html.replace('</head>', bootstrap + '  </head>')")) {
  Pass 'server injects inert product bootstrap into head'
} else {
  Fail 'server injects inert product bootstrap into head'
}

if ($html.IndexOf($clientBootstrapMarker) -ge 0) {
  Pass 'client bootstrap consumer remains present'
} else {
  Fail 'client bootstrap consumer remains present'
}
`;

    smoke = smoke.replace(insertAfter, added);
    write(smokePath, smoke);
    console.log(`PATCH ${smokePath} validates bootstrap ordering contract`);
  } else {
    console.log(`SKIP ${smokePath} ordering contract already present`);
  }
}

server = read(serverPath);
if (!server.includes("html.replace('</head>', bootstrap + '  </head>')")) {
  throw new Error('HOTFIX 16.3 final server head injection contract missing');
}
if (server.includes("html.replace('</body>', bootstrap + '  </body>')")) {
  throw new Error('HOTFIX 16.3 obsolete body-end bootstrap injection still present');
}

console.log('PASS POST-UX C HOTFIX 16.3 bootstrap ordering repair applied');
