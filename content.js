const pathRegex = /\/post\/([a-zA-Z0-9]+)/

const hookVideo = async (fragment, timestamp, video) => {
  video.addEventListener('timeupdate', async e => {
    await chrome.storage.local.set({ [`fp:${fragment}`]: video.currentTime })
  })
  video.currentTime = timestamp
  video.play()
}

const onload = async () => {
  const video = document.querySelector('video')

  const [_, fragment] = pathRegex.exec(window.location.pathname)
  const timestamp = (await chrome.storage.local.get([`fp:${fragment}`]))[
    `fp:${fragment}`
  ]

  if (video) {
    hookVideo(video)
  } else {
    const hooked = new Set()
    const observer = new MutationObserver(() => {
      const video = document.querySelector('video')
      if (video != null && !hooked.has(video)) {
        hooked.add(video)
        hookVideo(fragment, timestamp, video)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }
}

onload()
