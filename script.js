const DATA_URL = "terms.json";
const MAX_RESULTS = 10;
const DEBOUNCE_MS = 120;

let fuse;
let results = [];
let activeIndex = -1;

const $q = document.getElementById("q");
const $list = document.getElementById("suggestions");

const debounce = (fn, ms) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

async function loadData() {
  const res = await fetch(DATA_URL);
  const terms = await res.json();
  fuse = new Fuse(terms.map(t => ({ term: t })), {
    keys: ["term"],
    includeScore: false,
    threshold: 0.4,
    minMatchCharLength: 1,
    ignoreLocation: true,
    distance: 100
  });
}

function highlightMatch(text, query) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return `${text.slice(0, idx)}<strong>${text.slice(idx, idx + q.length)}</strong>${text.slice(idx + q.length)}`;
}

function renderSuggestions(items, query) {
  $list.innerHTML = "";
  if (!items.length) { $list.hidden = true; return; }

  items.slice(0, MAX_RESULTS).forEach((it, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.setAttribute("id", `opt-${i}`);
    li.innerHTML = highlightMatch(it.term, query);
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      choose(i);
    });
    $list.appendChild(li);
  });
  $list.hidden = false;
  activeIndex = -1;
}

function choose(index) {
  const item = results[index];
  if (!item) return;
  $q.value = item.term;
  $list.hidden = true;
  console.log("Buscado:", item.term);
}

function updateActive(newIndex) {
  const items = Array.from($list.children);
  if (!items.length) return;
  if (activeIndex >= 0) items[activeIndex].setAttribute("aria-selected", "false");
  activeIndex = (newIndex + items.length) % items.length;
  items[activeIndex].setAttribute("aria-selected", "true");
  items[activeIndex].scrollIntoView({ block: "nearest" });
}

const onInput = debounce(() => {
  const q = $q.value.trim();
  if (!q) { $list.hidden = true; return; }
  results = fuse.search(q).map(r => r.item);
  results.sort((a, b) => {
    const ap = a.term.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
    const bp = b.term.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
    return ap - bp || a.term.localeCompare(b.term);
  });
  renderSuggestions(results, q);
}, DEBOUNCE_MS);

$q.addEventListener("input", onInput);
$q.addEventListener("keydown", (e) => {
  if ($list.hidden) return;
  if (e.key === "ArrowDown") { e.preventDefault(); updateActive(activeIndex + 1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); updateActive(activeIndex - 1); }
  else if (e.key === "Enter") {
    if (activeIndex >= 0) { e.preventDefault(); choose(activeIndex); }
  } else if (e.key === "Escape") {
    $list.hidden = true;
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-box")) $list.hidden = true;
});

loadData();
