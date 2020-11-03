namespace(function() {

function isCellBridgePathFriendly(puzzle, color, pos) {
  if (pos.x%2 === 0 && pos.y%2 === 0) return false
  var cell = puzzle.getCell(pos.x, pos.y)
  return cell == undefined || cell.color == undefined || cell.color === color
}

function makeMinimalTree(graph, root, required) {
  var seen = Array(graph.length).fill(false)
  var result = Array(graph.length).fill(false)
  result[root] = true
  function dfs(node) {
    seen[node] = true
    result[node] = required[node]
    for (var child of graph[node]) {
      if (!seen[child]) {
        dfs(child)
        result[node] = result[node] || result[child]
      }
    }
  }
  dfs(root)
  return result
}

function isTreeUnique(graph, isInTree) {
  var seen = isInTree.slice()
  function dfs(node) {
    seen[node] = true
    var reachableTreeNode = undefined
    for (var child of graph[node]) {
      var candidate = undefined
      if (isInTree[child]) {
        candidate = child
      } else if (!seen[child]) {
        candidate = dfs(child)
      }
      if (candidate != undefined && candidate !== reachableTreeNode) {
        if (reachableTreeNode == undefined) {
          reachableTreeNode = candidate
        } else {
          return -1
        }
      }
    }
    return reachableTreeNode
  }
  for (var i = 0; i < graph.length; i++) {
    if (!seen[i]) {
      if (dfs(i) === -1) return false
    }
  }
  return true
}

function puzzleCellsAdjacent(first, second, pillar) {
  if (pillar && first.y == second.y && Math.abs(second.x - first.x) === puzzle.width - 1)
    return true
  return Math.abs(second.x - first.x) + Math.abs(second.y - first.y) === 1
}

window.bridgeTest = function(region, puzzle, color, bridges) {
  var nodes = region.cells.filter(pos => isCellBridgePathFriendly(puzzle, color, pos))
  var graph = Array.from(Array(nodes.length), () => [])
  for (var ir = 1; ir < nodes.length; ir++) {
    var right = nodes[ir]
    for (var il = 0; il < ir; il++) {
      var left = nodes[il]
      if (puzzleCellsAdjacent(left, right, puzzle.pillar)) {
        graph[il].push(ir)
        graph[ir].push(il)
      }
    }
  }
  var isBridge = nodes.map(node => bridges.some(bridge => node.x === bridge.x && node.y === bridge.y))
  var isInTree = makeMinimalTree(graph, isBridge.indexOf(true), isBridge)
  for (var i = 0; i < nodes.length; i++) {
    if (isBridge[i] && !isInTree[i]) return false
  }
  return isTreeUnique(graph, isInTree)
}

})