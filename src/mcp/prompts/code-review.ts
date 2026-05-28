export function buildCodeReviewPrompt(
    code: string,
    options?: { language?: string; context?: string }
): string {
    const contextLines = [
        options?.language && `- **언어/스택**: ${options.language}`,
        options?.context && `- **코드 목적/배경**: ${options.context}`
    ].filter(Boolean)
    const contextSection =
        contextLines.length > 0
            ? `## 컨텍스트\n${contextLines.join('\n')}\n\n`
            : ''
    const codeFence = options?.language?.toLowerCase() ?? ''

    return `당신은 시니어 소프트웨어 엔지니어입니다. 아래 코드에 대해 **코드 리뷰 베스트 프랙티스**에 따라 체계적으로 리뷰해 주세요.

## 리뷰 원칙
- 변경 의도를 먼저 파악하고, 가정이 필요하면 명시합니다.
- 문제점만이 아니라 **잘된 점**도 반드시 언급합니다.
- 모든 지적에는 **이유**와 **구체적인 개선 방향**을 함께 제시합니다.
- 스타일 취향보다 **버그·보안·유지보수성·성능**을 우선합니다.
- 가능하면 코드 위치(함수명·라인 등)를 참조해 설명합니다.

## 리뷰 체크리스트
1. **요약**: 전체 품질, 머지 가능 여부(Approve / Request changes / Comment)
2. **정확성**: 로직 오류, 엣지 케이스, null/undefined 처리
3. **가독성**: 네이밍, 함수 크기, 중복, 주석 필요 여부
4. **설계**: 단일 책임, 결합도, 확장성, 적절한 추상화
5. **에러 처리**: 예외 처리, 실패 시 복구, 사용자/호출자 피드백
6. **보안**: 입력 검증, 인젝션, 시크릿 노출, 권한 검사
7. **성능**: 불필요한 연산·할당, N+1, 비동기/동시성 이슈
8. **테스트**: 테스트 가능성, 누락된 테스트 케이스 제안
9. **유지보수성**: 타입 안전성, 의존성, 문서화 필요 여부

## 출력 형식
각 항목을 아래 구조로 작성합니다.

### [심각도] 제목
- **위치**: (함수/클래스/라인 등)
- **문제**: 무엇이 문제인지
- **제안**: 어떻게 고칠지 (가능하면 예시 코드)

심각도: \`critical\` | \`major\` | \`minor\` | \`nit\`

마지막에 **우선 수정 목록**(상위 3개)과 **잘된 점**을 bullet으로 정리합니다.

${contextSection}## 리뷰할 코드
\`\`\`${codeFence}
${code}
\`\`\``
}
