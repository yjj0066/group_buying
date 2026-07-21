export const formatGbAppSignupError = (
  raw: string,
  fallback: string
): string => {
  const message = raw.trim()

  if (!message) {
    return fallback
  }

  if (/Identity with email already exists|already exists/i.test(message)) {
    return "이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 사용해 주세요."
  }

  if (/Invalid email|valid email/i.test(message)) {
    return "이메일 형식이 올바르지 않습니다."
  }

  if (/password/i.test(message) && /short|least|8/i.test(message)) {
    return "비밀번호는 8자 이상 입력해 주세요."
  }

  if (/관심 아이돌/i.test(message)) {
    return message
  }

  if (/로그인이 필요|Unauthorized|unauthorized|세션이 만료/i.test(message)) {
    return message
  }

  if (/Failed to fetch|fetch failed|ECONNREFUSED|network/i.test(message)) {
    return "서버에 연결할 수 없습니다. 스토어프론트와 백엔드(dev 서버)가 실행 중인지 확인한 뒤 다시 시도해 주세요."
  }

  if (/This login method isn't supported|aren't supported/i.test(message)) {
    return "현재 로그인 방식으로는 가입을 완료할 수 없습니다. 이메일 가입을 이용해 주세요."
  }

  return message
}
