const decodeValue = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export const getActivationVersion = (scene: unknown) => {
  const rawScene = Array.isArray(scene) ? scene[0] : typeof scene === 'string' ? scene : ''
  if (!rawScene) return ''

  const decodedScene = decodeValue(rawScene)
  for (const item of decodedScene.split('&')) {
    const [rawKey, ...rawValueParts] = item.split('=')
    if (decodeValue(rawKey) !== 'v') continue
    return decodeValue(rawValueParts.join('=')).trim()
  }
  return ''
}
