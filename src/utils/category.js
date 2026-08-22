export function getCategory(importance, urgency) {
  // 50(=3점)은 중립으로 보고, 4점 이상(75+)부터 high로 분류
  if (importance > 50 && urgency > 50) return 'DO'
  if (importance > 50 && urgency <= 50) return 'SCHEDULE'
  if (importance <= 50 && urgency > 50) return 'DELEGATE'
  return 'ELIMINATE'
}
