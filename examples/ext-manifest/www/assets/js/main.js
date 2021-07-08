async function main() {
  const res = await fetch('assets/data/list.txt')
  const txt = await res.text()

  for (const id of txt.split('\n')) {
    const img = new Image()
    img.width = 36
    img.height = 36
    img.src = 'assets/img/emoji/' + id
    icons.appendChild(img)
  }

  icons.onclick = function(e) {
    if (e.target.tagName === 'IMG') {
      open(e.target.src)
    }
  }
}
main()