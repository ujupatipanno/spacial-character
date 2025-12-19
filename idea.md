# 기호 입력 플러그인 설정 탭 UI 아이디어

## 플러그인 개요
사용자가 자주 쓰는 기호들을 등록해두고, `/` 트리거로 빠르게 검색해서 입력하는 플러그인

## 데이터 구조

```typescript
interface SymbolItem {
    id: string;           // 검색용 식별자 (예: "arrow", "check", "star")
    symbol: string;       // 실제 기호 (예: "→", "✓", "★")
    description?: string; // 선택적 설명 (예: "오른쪽 화살표")
}

interface PluginSettings {
    triggerChar: string;     // 트리거 문자 (기본값: "/")
    fuzzySearch: boolean;    // 퍼지 검색 활성화 여부
    highlight: boolean;      // 매칭 하이라이트 표시 여부
    showDescription: boolean; // 설명 표시 여부
    symbols: SymbolItem[];   // 기호 목록 배열
}
```

## 설정 탭 UI 구성

### 1. 기본 설정 섹션

#### 1.1 트리거 문자 설정
- **컴포넌트**: 텍스트 입력 필드
- **제목**: "Trigger Character"
- **설명**: "Enter a character that will trigger symbol suggestion"
- **기본값**: "/"
- **유효성 검사**: 한 글자만 허용

#### 1.2 퍼지 검색 토글
- **컴포넌트**: 토글 스위치
- **제목**: "Enable Fuzzy Search"
- **설명**: "Match symbols even if you don't type the exact ID. Example: 'arr' → 'arrow'"
- **기본값**: true

#### 1.3 하이라이트 토글
- **컴포넌트**: 토글 스위치
- **제목**: "Highlight Matches"
- **설명**: "Highlight matching characters in search results"
- **기본값**: true

#### 1.4 설명 표시 토글
- **컴포넌트**: 토글 스위치
- **제목**: "Show Descriptions"
- **설명**: "Display symbol descriptions in the suggestion list"
- **기본값**: true

---

### 2. 기호 관리 섹션

#### 2.1 섹션 헤더
- **제목**: "Symbol List"
- **부제**: "Add, edit, or remove your frequently used symbols"

#### 2.2 기호 추가 버튼
- **컴포넌트**: 버튼
- **텍스트**: "+ Add New Symbol"
- **위치**: 기호 목록 상단
- **동작**: 
  - 빈 기호 항목을 목록에 추가
  - 자동으로 해당 항목의 입력 필드로 포커스 이동

#### 2.3 기호 항목 카드 (각 기호마다 반복)

각 기호는 다음과 같은 구조의 카드로 표시:

```
┌─────────────────────────────────────────────────────────┐
│ 🔤 Symbol #1                              [↑] [↓] [×]   │
├─────────────────────────────────────────────────────────┤
│ ID:          [___________________]                       │
│              Search identifier (e.g., "arrow", "check")  │
│                                                          │
│ Symbol:      [___________________]                       │
│              The actual symbol (e.g., "→", "✓")         │
│                                                          │
│ Description: [___________________]  (Optional)           │
│              Brief description                           │
└─────────────────────────────────────────────────────────┘
```

**카드 구성 요소**:

1. **카드 헤더**
   - 제목: "Symbol #N" (번호는 자동 부여)
   - 아이콘: 기호 또는 기본 이모지
   - 우측 버튼:
     - `[↑]` 위로 이동 (순서 변경)
     - `[↓]` 아래로 이동 (순서 변경)
     - `[×]` 삭제 (확인 메시지 표시)

2. **ID 입력 필드**
   - **Label**: "ID"
   - **Placeholder**: "arrow"
   - **설명**: "Search identifier (e.g., 'arrow', 'check')"
   - **유효성 검사**: 
     - 빈 값 불허
     - 중복 ID 경고
     - 영문/숫자/하이픈만 허용
   - **실시간 저장**: onChange 이벤트로 자동 저장

3. **Symbol 입력 필드**
   - **Label**: "Symbol"
   - **Placeholder**: "→"
   - **설명**: "The actual symbol (e.g., '→', '✓')"
   - **미리보기**: 입력한 기호를 크게 표시 (옵션)
   - **유효성 검사**: 빈 값 불허
   - **실시간 저장**: onChange 이벤트로 자동 저장

4. **Description 입력 필드**
   - **Label**: "Description (Optional)"
   - **Placeholder**: "Right arrow"
   - **설명**: "Brief description of the symbol"
   - **실시간 저장**: onChange 이벤트로 자동 저장

#### 2.4 기호 목록 빈 상태
기호가 하나도 없을 때:
```
┌─────────────────────────────────────────────┐
│        📝 No symbols added yet               │
│                                              │
│   Click "Add New Symbol" to get started     │
└─────────────────────────────────────────────┘
```

---

### 3. 기본 기호 세트 섹션 (선택 사항)

#### 3.1 프리셋 가져오기
- **컴포넌트**: 드롭다운 + 버튼
- **제목**: "Import Preset"
- **설명**: "Quickly add commonly used symbol sets"
- **프리셋 옵션**:
  - "Arrows" → ←, →, ↑, ↓, ↔, ↕, ⇐, ⇒, ⇑, ⇓
  - "Check Marks" → ✓, ✔, ✗, ✘, ☐, ☑, ☒
  - "Stars & Shapes" → ★, ☆, ●, ○, ■, □, ▲, ▼
  - "Math Symbols" → ±, ×, ÷, ≈, ≠, ≤, ≥, ∞
  - "Currency" → $, €, £, ¥, ₩, ฿
- **버튼**: "Import Selected Preset"
- **동작**: 선택한 프리셋의 기호들을 현재 목록에 추가

---

### 4. 액션 버튼 섹션

#### 4.1 전체 초기화 버튼
- **컴포넌트**: 버튼 (경고 스타일)
- **텍스트**: "Reset to Default"
- **위치**: 설정 하단
- **동작**: 
  - 확인 대화상자 표시
  - 모든 설정을 기본값으로 리셋
  - 기호 목록 비움

#### 4.2 내보내기/가져오기 버튼 (고급 기능)
- **내보내기 버튼**: "Export Symbols"
  - JSON 파일로 현재 기호 목록 저장
- **가져오기 버튼**: "Import Symbols"
  - JSON 파일에서 기호 목록 불러오기
  - 기존 목록과 병합 옵션

---

## UI/UX 개선 아이디어

### 실시간 미리보기
- 설정 탭 우측에 미니 에디터 표시
- 실시간으로 트리거 입력 → 제안 표시 테스트 가능
- "Test your settings here" 라벨

### 검색 및 필터링
- 기호 목록이 많을 경우를 대비한 검색 바
- ID, Symbol, Description 모두 검색 대상
- 실시간 필터링

### 드래그 앤 드롭 정렬
- 화살표 버튼 대신 드래그로 순서 변경
- 마우스 호버 시 핸들 아이콘 표시

### 기호 카테고리
- 기호를 카테고리별로 그룹화 (선택 사항)
- 카테고리별 접기/펼치기
- 예: "Arrows", "Math", "Currency" 등

### 키보드 단축키 지원
- `Ctrl + N`: 새 기호 추가
- `Ctrl + S`: 설정 저장 (자동 저장이지만 사용자 피드백용)
- `Delete`: 선택한 기호 삭제
- `Ctrl + ↑/↓`: 선택한 기호 이동

### 사용 통계 (고급 기능)
- 각 기호의 사용 횟수 추적
- 자주 사용하는 기호 순으로 자동 정렬 옵션
- 사용량 배지 표시

---

## 기본 기호 세트 예시

```typescript
const DEFAULT_SYMBOLS: SymbolItem[] = [
    { id: "arrow-right", symbol: "→", description: "Right arrow" },
    { id: "arrow-left", symbol: "←", description: "Left arrow" },
    { id: "check", symbol: "✓", description: "Check mark" },
    { id: "cross", symbol: "✗", description: "Cross mark" },
    { id: "star", symbol: "★", description: "Filled star" },
    { id: "circle", symbol: "●", description: "Filled circle" },
    { id: "square", symbol: "■", description: "Filled square" },
    { id: "infinity", symbol: "∞", description: "Infinity" },
];
```

---

## 설정 저장 형식

```json
{
    "triggerChar": "/",
    "fuzzySearch": true,
    "highlight": true,
    "showDescription": true,
    "symbols": [
        {
            "id": "arrow-right",
            "symbol": "→",
            "description": "Right arrow"
        },
        {
            "id": "check",
            "symbol": "✓",
            "description": "Check mark"
        }
    ]
}
```

---

## 구현 시 고려사항

1. **유효성 검사**
   - ID 중복 체크
   - 필수 필드 검증 (ID, Symbol)
   - 트리거 문자 길이 제한

2. **사용자 피드백**
   - 저장 성공/실패 알림
   - 삭제 확인 대화상자
   - 유효성 검사 오류 메시지

3. **성능 최적화**
   - 많은 기호가 있을 때 가상 스크롤링
   - 입력 debounce 처리
   - 효율적인 렌더링

4. **접근성**
   - 키보드 네비게이션 지원
   - 적절한 ARIA 레이블
   - 명확한 시각적 피드백

5. **데이터 무결성**
   - 설정 파일 손상 시 복구 메커니즘
   - 백업 및 복원 기능
   - 버전 마이그레이션
