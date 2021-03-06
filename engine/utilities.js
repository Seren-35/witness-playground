function namespace(code) {
  code()
}

namespace(function() {

/*** Start cross-compatibility ***/
// Used to detect if IDs include a direction, e.g. resize-top-left
if (!String.prototype.includes) {
  String.prototype.includes = function() {
    return String.prototype.indexOf.apply(this, arguments) !== -1
  }
}
Event.prototype.movementX = Event.prototype.movementX || Event.prototype.mozMovementX
Event.prototype.movementY = Event.prototype.movementY || Event.prototype.mozMovementY
Event.prototype.isRightClick = function() {
  return this.which === 3 || (this.touches && this.touches.length > 1)
}
Element.prototype.requestPointerLock = Element.prototype.requestPointerLock || Element.prototype.mozRequestPointerLock || function() {
  document.pointerLockElement = this
  document.onpointerlockchange()
}
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || function() {
  document.pointerLockElement = null
  document.onpointerlockchange()
}
/*** End cross-compatibility ***/

// https://stackoverflow.com/q/12571650
window_onerror = window.onerror
window.onerror = function(message, url, line) {
  FEEDBACK(message + ' on line ' + line)
  if (window_onerror == undefined) {
    console.error('Parse error in file ' + url + ' on line ' + line)
  } else {
    window_onerror(message, url, line)
  }
}

var trackNames = ['start', 'success', 'fail', 'abort']
var tracks = {
  'start':   new Audio(src='./data/panel_start_tracing.aac'),
  'success': new Audio(src='./data/panel_success.aac'),
  'fail':    new Audio(src='./data/panel_failure.aac'),
  'abort':   new Audio(src='./data/panel_abort_tracing.aac'),
}
for (var name of trackNames) tracks[name].muted = true

window.PLAY_SOUND = function(targetAudio) {
  console.log('Playing sound:', targetAudio)
  tracks[targetAudio].pause()
  tracks[targetAudio].play().then(function() {
    // If the audio plays, then we're all set -- mark it as good and continue.
    // This is the expected behavior on all non-iOS platforms.
    console.debug('Played successfully')
    tracks[targetAudio].currentTime = 0
    tracks[targetAudio].volume = localStorage.volume
    tracks[targetAudio].muted = false
  }).catch(function() {
    // If the audio does not play, swap it out for an audio element that works.
    // This will usually cause lag, since the target audio track needs to be fetched again.
    console.debug('Audio failed')

    var badAudio = targetAudio
    targetAudio = null
    for (var name of trackNames) {
      if (!tracks[name].muted) {
        targetAudio = name
        break
      }
    }
    console.debug('Selected alternative audio object: ' + targetAudio)
    if (!targetAudio) return // No good audio tracks available.

    var tmp = tracks[badAudio]
    tmp.src = tracks[badAudio].src
    tracks[badAudio] = tracks[targetAudio]
    tracks[badAudio].src = tracks[targetAudio].src
    tracks[targetAudio] = tmp
    tracks[targetAudio].src = tmp.src
    tracks[targetAudio].pause()
    tracks[targetAudio].play().then(function() {
      console.debug('Backup audio track worked')
      tracks[targetAudio].currentTime = 0
      tracks[targetAudio].volume = localStorage.volume
    }).catch(function(error) {
      // Welp, we tried.
      console.error('Backup audio track failed: ' + error)
    })
  })
}

window.FEEDBACK = function(message) {
  var request = new XMLHttpRequest()
  request.open('POST', '/feedback', true) // Fire and forget
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  request.send('data=' + message)
}

window.ERROR = function(message) {
  var request = new XMLHttpRequest()
  request.open('POST', '/error', true) // Fire and forget
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  request.send('data=' + message)
}

window.LINE_PRIMARY = '#8FF'
window.LINE_SECONDARY = '#FF2'

window.BACKGROUND       = '#39C'
window.OUTER_BACKGROUND = '#26A'
window.FOREGROUND       = '#124'
window.BORDER           = '#111'
window.LINE_DEFAULT     = '#789'
window.LINE_SUCCESS     = '#DDD'
window.LINE_FAIL        = '#081122'
window.CURSOR           = '#FFF'
window.TEXT_COLOR       = '#AAA'
window.PAGE_BACKGROUND  = '#000'
window.ALT_BACKGROUND   = '#333'
window.ACTIVE_COLOR     = '#555'

window.LINE_NONE     = 0
window.LINE_BLACK    = 1
window.LINE_BLUE     = 2
window.LINE_YELLOW   = 3
window.DOT_NONE      = 0
window.DOT_BLACK     = 1
window.DOT_BLUE      = 2
window.DOT_YELLOW    = 3
window.DOT_INVISIBLE = 4
window.GAP_NONE      = 0
window.GAP_BREAK     = 1
window.GAP_FULL      = 2

window.currentPanel = JSON.parse(localStorage.getItem('currentPanel') ?? '1')
window.unlockedPanel = JSON.parse(localStorage.getItem('unlockedPanel') ?? '1')
window.knownPuzzles = []

var animations = ''
function l(line) {animations += line + '\n'}
// pointer-events: none; allows for onclick events to bubble up (so that editor hooks still work)
l('.line-1 {')
l('  fill: ' + window.LINE_DEFAULT + ';')
l('  pointer-events: none;')
l('}')
l('.line-2 {')
l('  fill: ' + window.LINE_PRIMARY + ';')
l('  pointer-events: none;')
l('}')
l('.line-3 {')
l('  fill: ' + window.LINE_SECONDARY + ';')
l('  pointer-events: none;')
l('}')
l('@keyframes line-success {to {fill: ' + window.LINE_SUCCESS + ';}}')
l('@keyframes line-fail {to {fill: ' + window.LINE_FAIL + ';}}')
l('@keyframes error {to {fill: red;}}')
l('@keyframes fade {to {opacity: 0.35;}}')
l('@keyframes start-grow {from {r:12;} to {r: 24;}}')
// Neutral button style
l('button {')
l('  background-color: ' + window.ALT_BACKGROUND + ';')
l('  border: 1px solid ' + window.BORDER + ';')
l('  border-radius: 2px;')
l('  color: ' + window.TEXT_COLOR + ';')
l('  display: inline-block;')
l('  margin: 0px;')
l('  outline: none;')
l('  opacity: 1.0;')
l('  padding: 1px 6px;')
l('  -moz-appearance: none;')
l('  -webkit-appearance: none;')
l('}')
// Active (while held down) button style
l('button:active {background-color: ' + window.ACTIVE_COLOR + ';}')
// Disabled button style
l('button:disabled {opacity: 0.5;}')
// Selected button style (see https://stackoverflow.com/a/63108630)
l('button:focus {outline: none;}')
l = null

var style = document.createElement('style')
style.type = 'text/css'
style.title = 'animations'
style.appendChild(document.createTextNode(animations))
document.head.appendChild(style)

// Custom logging to allow leveling
var consoleError = console.error
var consoleWarn = console.warn
var consoleInfo = console.log
var consoleLog = console.log
var consoleDebug = console.log
var consoleSpam = console.log
var consoleGroup = console.group
var consoleGroupEnd = console.groupEnd

window.setLogLevel = function(level) {
  console.error = function() {}
  console.warn = function() {}
  console.info = function() {}
  console.log = function() {}
  console.debug = function() {}
  console.spam = function() {}
  console.group = function() {}
  console.groupEnd = function() {}

  if (level === 'none') return

  // Instead of throw, but still red flags and is easy to find
  console.error = consoleError
  if (level === 'error') return

  // Less serious than error, but flagged nonetheless
  console.warn = consoleWarn
  if (level === 'warn') return

  // Default visible, important information
  console.info = consoleInfo
  if (level === 'info') return

  // Useful for debugging (mainly validation)
  console.log = consoleLog
  if (level === 'log') return

  // Useful for serious debugging (mainly graphics/misc)
  console.debug = consoleDebug
  if (level === 'debug') return

  // Useful for insane debugging (mainly tracing/recursion)
  console.spam = consoleSpam
  console.group = consoleGroup
  console.groupEnd = consoleGroupEnd
  if (level === 'spam') return
}
setLogLevel('info')

window.deleteElementsByClassName = function(rootElem, className) {
  var elems = []
  while (true) {
    elems = rootElem.getElementsByClassName(className)
    if (elems.length === 0) break
    elems[0].remove()
  }
}

window.loadHeader = function(titleText) {
  document.body.style.marginLeft = '0px'

  var navbar = document.createElement('div')
  document.body.appendChild(navbar)
  navbar.className = 'navbar'
  navbar.style = 'position: fixed; left:0; top: 0; width: 100%; z-index: 1'
  navbar.style.background = 'rgba(0, 0, 0, 0)'
  
  window.updatePuzzle = function() {
    if (window.knownPuzzles[currentPanel] != undefined) {
      window.currentPuzzle = window.knownPuzzles[currentPanel]
      draw(window.currentPuzzle)
      return
    }
    window.currentPuzzle = undefined
    var svg = document.getElementById('puzzle')
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    var request = new XMLHttpRequest()
    request.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        window.currentPuzzle = Puzzle.deserialize(this.responseText)
        draw(window.currentPuzzle)
      }
    }
    request.open("GET", "puzzles/" + window.currentPanel + '.json', true)
    request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
    request.send()
  }
  
  var arrowLeft = drawSymbol({'type':'arrowhead', 'width':1, 'height':1, 'color':window.BORDER, 'degrees':180})
  document.body.appendChild(arrowLeft)
  arrowLeft.style = 'width: 100px; height: 100px; position: absolute; left: 50px; top: 50%; transform: translateY(-50%)'
  arrowLeft.id = 'arrowLeft'
  arrowLeft.onclick = function() {
    if (window.currentPanel !== 1) {
      window.knownPuzzles[currentPanel] = window.currentPuzzle
      window.currentPanel--
      localStorage.setItem('currentPanel', JSON.stringify(window.currentPanel))
      window.updateArrows()
      updatePuzzle()
    }
  }
  
  var arrowRight = drawSymbol({'type':'arrowhead', 'width':1, 'height':1, 'color':window.BORDER, 'degrees':0})
  document.body.appendChild(arrowRight)
  arrowRight.style = 'width: 100px; height: 100px; position: absolute; right: 50px; top: 50%; transform: translateY(-50%)'
  arrowRight.id = 'arrowRight'
  arrowRight.onclick = function() {
    if (window.currentPanel !== window.unlockedPanel) {
      window.knownPuzzles[currentPanel] = window.currentPuzzle
      window.currentPanel++
      localStorage.setItem('currentPanel', JSON.stringify(window.currentPanel))
      window.updateArrows()
      updatePuzzle()
    }
  }
  
  window.updateArrows = function() {
    arrowLeft.style.opacity = window.currentPanel === 1 ? 0.3 : 1
    arrowRight.style.opacity = window.currentPanel === window.unlockedPanel ? 0.3 : 1
  }
  updateArrows()

  var collapsedSettings = drawSymbol({'type': 'plus', 'width':20, 'height':20})
  navbar.appendChild(collapsedSettings)
  collapsedSettings.style = 'width: 20px; height: 20px; position: absolute; left: 0; cursor: pointer'
  collapsedSettings.style.border = '2px solid ' + window.BORDER
  collapsedSettings.id = 'collapsedSettings'
  collapsedSettings.onclick = function() {
    this.style.display = 'none'
    var expandedSettings = document.getElementById('expandedSettings')
    expandedSettings.style.display = null
  }

  var expandedSettings = document.createElement('div')
  navbar.appendChild(expandedSettings)
  expandedSettings.style = 'width: 250px; position: absolute; left: 0; display: none; padding: 10px'
  expandedSettings.style.border = '2px solid ' + window.BORDER
  expandedSettings.style.background = window.PAGE_BACKGROUND
  expandedSettings.id = 'expandedSettings'

  var minus = drawSymbol({'type':'minus', 'width':20, 'height':20})
  minus.style = 'width: 20px; height: 20px; cursor: pointer; position: absolute; top: 0; left: 0'
  expandedSettings.appendChild(minus)
  minus.onclick = function() {
    this.parentElement.style.display = 'none'
    var collapsedSettings = document.getElementById('collapsedSettings')
    collapsedSettings.style.display = null
  }

  // Now, for the contents of the settings
  var settingsLabel = document.createElement('label')
  expandedSettings.appendChild(settingsLabel)
  settingsLabel.innerText = 'settings'
  settingsLabel.style = 'line-height: 0px' // Attach to the top

  expandedSettings.appendChild(document.createElement('br'))
  expandedSettings.appendChild(document.createElement('br'))

  // Theme
  document.body.style.color = window.TEXT_COLOR
  document.body.style.backgroundImage = 'url("./images/background.jpg")'
  document.body.style.backgroundSize = 'cover'
  document.body.style.backgroundPosition = 'center'

  // Sensitivity
  var sensLabel = document.createElement('label')
  expandedSettings.appendChild(sensLabel)
  sensLabel.htmlFor = 'sens'
  sensLabel.innerText = 'Mouse Speed 2D'

  if (localStorage.sensitivity == undefined) localStorage.sensitivity = 0.7
  var sens = document.createElement('input')
  expandedSettings.appendChild(sens)
  sens.type = 'range'
  sens.id = 'sens'
  sens.min = '0.1'
  sens.max = '1.3'
  sens.step = '0.1'
  sens.value = localStorage.sensitivity
  sens.onchange = function() {
    localStorage.sensitivity = this.value
  }
  sens.style.backgroundImage = 'linear-gradient(to right, ' + window.ALT_BACKGROUND + ', ' + window.ACTIVE_COLOR + ')'

  // Volume
  var volumeLabel = document.createElement('label')
  expandedSettings.appendChild(volumeLabel)
  volumeLabel.htmlFor = 'volume'
  volumeLabel.innerText = 'Volume'

  if (localStorage.volume == undefined || localStorage.volume < 0 || localStorage.volume > 0.24) {
    localStorage.volume = 0.12
  }
  var volume = document.createElement('input')
  expandedSettings.appendChild(volume)
  volume.type = 'range'
  volume.id = 'volume'
  volume.min = '0'
  volume.max = '0.24'
  volume.step = '0.02'
  volume.value = localStorage.volume
  volume.onchange = function() {
    localStorage.volume = this.value
  }
  volume.style.backgroundImage = 'linear-gradient(to right, ' + window.ALT_BACKGROUND + ', ' + window.ACTIVE_COLOR + ')'
	
  expandedSettings.appendChild(document.createElement('br'))
  expandedSettings.appendChild(document.createElement('br'))
	
	var aboutModal = document.createElement('div')
	navbar.appendChild(aboutModal)
	aboutModal.style.display = 'none'
	aboutModal.style.position = 'fixed'
	aboutModal.style.zIndex = '1'
	aboutModal.style.paddingTop = '50px'
	aboutModal.style.left = '0'
	aboutModal.style.top = '0'
	aboutModal.style.width = '100%'
	aboutModal.style.height = '100%'
	aboutModal.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
	
	var aboutContent = document.createElement('div')
	aboutModal.appendChild(aboutContent)
	aboutContent.style.backgroundColor = 'black'
	aboutContent.style.margin = 'auto'
	aboutContent.style.padding = '20px'
	aboutContent.style.width = '80%'
	aboutContent.style.height = '80%'
	aboutContent.style.boxShadow = '0 0 50px 50px black'
	aboutContent.style.color = '#aaa'
	aboutContent.style.textAlign = 'left'
	aboutContent.style.fontSize = '1.2em'
	aboutContent.style.overflow = 'auto'
	
	var aboutClose = document.createElement('a')
	aboutContent.appendChild(aboutClose)
  aboutClose.href = '#'
	aboutClose.style.cssFloat = 'right'
	aboutClose.style.fontSize = '30px'
	aboutClose.style.fontWeight = 'bold'
	aboutClose.innerText = '\u00D7'
	aboutClose.style.color = 'white'
	aboutClose.onclick = function(event) {
		aboutModal.style.display = 'none'
	}
	
	var aboutText = document.createElement('p')
	aboutContent.appendChild(aboutText)
	aboutText.innerText = 'Witness Playground by Seren\n\nContains portions of code from Witness Puzzles by darkid licensed under the BSD 3-Clause License:\n\n'
	
	var licenseText = document.createElement('pre')
	aboutText.appendChild(licenseText)
	window.fetch('engine/LICENSE.md').then(response => response.text()).then(function(text) {
			licenseText.innerText = text
	})
	
  var aboutButton = document.createElement('a')
  expandedSettings.appendChild(aboutButton)
  aboutButton.href = '#'
	aboutButton.style.color = '#4c9'
  aboutButton.innerText = 'About'
	aboutButton.onclick = function() {
		aboutModal.style.display = 'block'
	}
}

// Automatically solve the puzzle
function solvePuzzle() {
  if (window.setSolveMode) window.setSolveMode(false)
  document.getElementById('solutionViewer').style.display = 'none'
  document.getElementById('progressBox').style.display = null
  document.getElementById('solveAuto').innerText = 'Cancel Solving'
  document.getElementById('solveAuto').onclick = function() {
    this.innerText = 'Cancelling...'
    this.onclick = null
    window.setTimeout(window.cancelSolving, 0)
  }

  window.solve(window.puzzle, function(percent) {
    document.getElementById('progressPercent').innerText = percent + '%'
    document.getElementById('progress').style.width = percent + '%'
  }, function(paths) {
    document.getElementById('progressBox').style.display = 'none'
    document.getElementById('solutionViewer').style.display = null
    document.getElementById('progressPercent').innerText = '0%'
    document.getElementById('progress').style.width = '0%'
    document.getElementById('solveAuto').innerText = 'Solve (automatically)'
    document.getElementById('solveAuto').onclick = solvePuzzle

    window.puzzle.autoSolved = true
    paths = window.onSolvedPuzzle(paths)
    showSolution(window.puzzle, paths, 0)
  })
}

function showSolution(puzzle, paths, num) {
  var previousSolution = document.getElementById('previousSolution')
  var solutionCount = document.getElementById('solutionCount')
  var nextSolution = document.getElementById('nextSolution')

  if (paths.length === 0) { // 0 paths, arrows are useless
    solutionCount.innerText = '0 of 0'
    previousSolution.disabled = true
    nextSolution.disabled = true
    return
  }

  while (num < 0) num = paths.length + num
  while (num >= paths.length) num = num - paths.length

  if (paths.length === 1) { // 1 path, arrows are useless
    solutionCount.innerText = '1 of 1'
    if (paths.length >= window.MAX_SOLUTIONS) solutionCount.innerText += '+'
    previousSolution.disabled = true
    nextSolution.disabled = true
  } else {
    solutionCount.innerText = (num + 1) + ' of ' + paths.length
    if (paths.length >= window.MAX_SOLUTIONS) solutionCount.innerText += '+'
    previousSolution.disabled = false
    nextSolution.disabled = false
    previousSolution.onclick = function(event) {
      if (event.shiftKey) {
        showSolution(puzzle, paths, num - 10)
      } else {
        showSolution(puzzle, paths, num - 1)
      }
    }
    nextSolution.onclick = function(event) {
      if (event.shiftKey) {
        showSolution(puzzle, paths, num + 10)
      } else {
        showSolution(puzzle, paths, num + 1)
      }
    }
  }
  if (paths[num] != undefined) {
    // Draws the given path, and also updates the puzzle to have path annotations on it.
    window.drawPath(puzzle, paths[num])
  }
}

// Required global variables/functions:
// window.puzzle
// window.onSolvedPuzzle()
// window.MAX_SOLUTIONS // defined by solve.js
window.addSolveButtons = function() {
  var parent = document.currentScript.parentElement

  var solveMode = document.createElement('div')
  parent.appendChild(solveMode)
  solveMode.id = 'solveMode'
  solveMode.style.width = '22px'
  solveMode.style.height = '22px'
  solveMode.style.borderRadius = '6px'
  solveMode.style.display = 'inline-block'
  solveMode.style.verticalAlign = 'text-bottom'
  solveMode.style.marginRight = '6px'
  solveMode.style.borderWidth = '1.5px'
  solveMode.style.borderStyle = 'solid'
  solveMode.style.borderColor = window.BORDER
  solveMode.style.background = window.PAGE_BACKGROUND
  solveMode.style.color = window.TEXT_COLOR

  solveMode.onpointerdown = function() {
    this.checked = !this.checked
    this.style.background = (this.checked ? window.BORDER : window.PAGE_BACKGROUND)
    if (window.setSolveMode) window.setSolveMode(this.checked)
  }

  var solveManual = document.createElement('label')
  parent.appendChild(solveManual)
  solveManual.onpointerdown = function() {solveMode.onpointerdown()}
  solveManual.innerText = 'Solve (manually)'
  solveManual.style = 'margin-right: 8px'

  var solveAuto = document.createElement('button')
  parent.appendChild(solveAuto)
  solveAuto.id = 'solveAuto'
  solveAuto.innerText = 'Solve (automatically)'
  solveAuto.onclick = solvePuzzle
  solveAuto.style = 'margin-right: 8px'

  var div = document.createElement('div')
  parent.appendChild(div)
  div.style = 'display: inline-block; vertical-align:top'

  var progressBox = document.createElement('div')
  div.appendChild(progressBox)
  progressBox.id = 'progressBox'
  progressBox.style = 'display: none; width: 220px; border: 1px solid black; margin-top: 2px'

  var progressPercent = document.createElement('label')
  progressBox.appendChild(progressPercent)
  progressPercent.id = 'progressPercent'
  progressPercent.style = 'float: left; margin-left: 4px'
  progressPercent.innerText = '0%'

  var progress = document.createElement('div')
  progressBox.appendChild(progress)
  progress.id = 'progress'
  progress.style = 'z-index: -1; height: 38px; width: 0%; background-color: #390'

  var solutionViewer = document.createElement('div')
  div.appendChild(solutionViewer)
  solutionViewer.id = 'solutionViewer'
  solutionViewer.style = 'display: none'

  var previousSolution = document.createElement('button')
  solutionViewer.appendChild(previousSolution)
  previousSolution.id = 'previousSolution'
  previousSolution.innerHTML = '&larr;'

  var solutionCount = document.createElement('label')
  solutionViewer.appendChild(solutionCount)
  solutionCount.id = 'solutionCount'
  solutionCount.style = 'padding: 6px'

  var nextSolution = document.createElement('button')
  solutionViewer.appendChild(nextSolution)
  nextSolution.id = 'nextSolution'
  nextSolution.innerHTML = '&rarr;'
}




















/// ------------
/// Everything below this is legacy, and should not be used.
/// ============

function loadFeedback() {
  var feedbackButton = document.createElement('label')
  document.currentScript.parentElement.appendChild(feedbackButton)
  feedbackButton.innerText = 'Send feedback'
  feedbackButton.style.margin = 'auto'
  feedbackButton.style.cursor = 'pointer'
  feedbackButton.style.fontSize = '28'
  feedbackButton.onclick = function () {
    var feedback = prompt('Provide feedback:')
    if (feedback) {
      window.FEEDBACK(feedback)
    }
  }
}

function hideSettings() {
  localStorage.settings = 'hidden'
  var settings = document.getElementById('settings')
  settings.style.display = 'none'
  var toggle = document.getElementById('settingsToggle')
  toggle.innerHTML = '+'
  toggle.onclick = function(){ showSettings() }
  toggle.parentElement.style.width = '20px'
  toggle.parentElement.style.height = '20px'
  toggle.style.top = '-11px'
}

function showSettings() {
  localStorage.settings = 'visible'
  var settings = document.getElementById('settings')
  settings.style.display = null
  var toggle = document.getElementById('settingsToggle')
  toggle.innerHTML = '&ndash; &nbsp; &nbsp; &nbsp; &nbsp;settings&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; '
  toggle.onclick = function(){ hideSettings() }
  toggle.parentElement.style.width = '250px'
  toggle.parentElement.style.height = null
  toggle.style.top = '-10px'
}

// @Cleanup: Settings should live in one variable in localStorage, it makes it easier to save them / persist them across clears
function loadSettings(parent) {
  parent = parent || document.currentScript.parentElement
  var parentDiv = document.createElement('div')
  parent.appendChild(parentDiv)
  parentDiv.style.position = 'absolute'
  parentDiv.style.border = '2px solid ' + window.BORDER
  parentDiv.style.background = window.PAGE_BACKGROUND

  var toggle = document.createElement('label')
  parentDiv.appendChild(toggle)
  toggle.style.position = 'absolute'
  toggle.style.left = '2'
  toggle.style.cursor = 'pointer'
  toggle.id = 'settingsToggle'

  var settings = document.createElement('div')
  parentDiv.appendChild(settings)
  settings.id = 'settings'
  settings.style.margin = '10px'

  if (localStorage.settings === 'hidden') {
    hideSettings()
  } else {
    showSettings()
  }

  // Now, for the contents of the settings
  settings.appendChild(document.createElement('br'))

  // Theme
  var themeBox = document.createElement('input')
  settings.appendChild(themeBox)
  themeBox.className = 'checkbox'
  themeBox.type = 'checkbox'
  themeBox.id = 'theme'
  themeBox.onchange = function() {
    localStorage.theme = this.checked
    location.reload()
  }
  themeBox.checked = (localStorage.theme === 'true')
  // This needs to happen now, since the document body hasn't yet loaded.
  document.body.style.color = window.TEXT_COLOR
  document.body.style.background = window.PAGE_BACKGROUND

  var themeLabel = document.createElement('label')
  settings.appendChild(themeLabel)
  themeLabel.htmlFor = 'theme'
  themeLabel.innerText = ' Dark theme'

  settings.appendChild(document.createElement('br'))
  settings.appendChild(document.createElement('br'))

  // Sensitivity
  var sensLabel = document.createElement('label')
  settings.appendChild(sensLabel)
  sensLabel.htmlFor = 'sens'
  sensLabel.innerText = 'Mouse Speed 2D'

  if (localStorage.sensitivity == undefined) localStorage.sensitivity = 0.7
  var sens = document.createElement('input')
  settings.appendChild(sens)
  sens.style.width = '100%'
  sens.type = 'range'
  sens.id = 'sens'
  sens.min = '0.1'
  sens.max = '1.3'
  sens.step = '0.1'
  sens.value = localStorage.sensitivity
  sens.onchange = function() {
    localStorage.sensitivity = this.value
  }

  // Volume
  var volumeLabel = document.createElement('label')
  settings.appendChild(volumeLabel)
  volumeLabel.htmlFor = 'volume'
  volumeLabel.innerText = 'Volume'

  if (localStorage.volume == undefined || localStorage.volume < 0 || localStorage.volume > 0.24) {
    localStorage.volume = 0.12
  }
  var volume = document.createElement('input')
  settings.appendChild(volume)
  volume.style.width = '100%'
  volume.type = 'range'
  volume.id = 'volume'
  volume.min = '0'
  volume.max = '0.24'
  volume.step = '0.02'
  volume.value = localStorage.volume
  volume.onchange = function() {
    localStorage.volume = this.value
  }
}

})
