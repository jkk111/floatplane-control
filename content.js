const pathRegex = /\/post\/([a-zA-Z0-9]+)/
const timestampRegex = /(\d+):(\d+)(?::(\d+))?/

const hookedVideos = []

const hookVideo = async (fragment, timestamp, video) => {
  hookedVideos.push(video)
  video.addEventListener('timeupdate', async () => {
    await chrome.storage.local.set({ [`fp:${fragment}`]: video.currentTime })
  })
  video.addEventListener('ended', async () => {
    await chrome.storage.local.set({ [`fp:${fragment}`]: 0 })
  })
  video.currentTime = timestamp
  try {
    await video.play()
  } catch {}
}

const seek = async (hours, minutes, seconds) => {
  if (seconds == null) {
    seconds = minutes
    minutes = hours
    hours = 0
  }

  const secondsElapsed =
    parseInt(hours, 10) * 60 * 60 +
    parseInt(minutes, 10) * 60 +
    parseInt(seconds, 10)

  for (const video of hookedVideos) {
    if (document.contains(video)) {
      video.currentTime = secondsElapsed
      try {
        video.scrollIntoView()
        await video.play()
      } catch {}
    }
  }
}

const onload = async () => {
  const [_, fragment] = pathRegex.exec(window.location.pathname)
  let timestamp = (await chrome.storage.local.get([`fp:${fragment}`]))[
    `fp:${fragment}`
  ]

  if (Number.isNaN(timestamp) || !Number.isFinite(timestamp)) {
    timestamp = 0
  }

  const hooked = new Set()
  const observer = new MutationObserver(() => {
    const video = document.querySelector('video')
    if (video != null && !hooked.has(video)) {
      hooked.add(video)
      hookVideo(fragment, timestamp, video)
    }

    const comments = [
      ...document.querySelectorAll('.comment-body p:not([data-visited])'),
    ]

    for (const comment of comments) {
      comment.dataset['visited'] = true
      let text = comment.innerText
      let tsMatch = timestampRegex.exec(text)
      const fragments = []
      while (tsMatch != null) {
        if (tsMatch.index === 0) {
          text = text.slice(tsMatch[0].length)
          const anchor = document.createElement('a')
          const match = tsMatch
          anchor.onclick = e => {
            e.preventDefault()
            e.stopPropagation()
            seek(match[1], match[2], match[3])
          }
          anchor.style.cursor = 'pointer'
          anchor.innerText = tsMatch[0]
          fragments.push(anchor)
        } else {
          const textFragment = text.slice(0, tsMatch.index)
          text = text.slice(tsMatch.index)
          fragments.push(textFragment)
        }
        tsMatch = timestampRegex.exec(text)
      }
      if (text?.trim()?.length > 0) {
        fragments.push(text)
      }
      comment.replaceChildren(...fragments)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

onload()
