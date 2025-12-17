const slug = window.location.pathname.replace('/', '');


fetch(`/content/releases/${slug}.md`)
.then(r => r.text())
.then(md => {
const data = jsyaml.load(md);


document.getElementById('cover').src = data.cover;
document.getElementById('title').innerText = data.title;
document.getElementById('desc').innerText = data.description;


const links = document.getElementById('links');


if (data.spotify) links.innerHTML += `<a href="${data.spotify}">Spotify</a>`;
if (data.apple) links.innerHTML += `<a href="${data.apple}">Apple Music</a>`;
if (data.youtube) links.innerHTML += `<a href="${data.youtube}">YouTube</a>`;
if (data.deezer) links.innerHTML += `<a href="${data.deezer}">Deezer</a>`;
});