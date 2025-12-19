# 재사용 가능한 코드 모음

## 1. 데이터 구조

### SymbolItem 인터페이스
**사용처**: 각 기호 항목의 데이터 구조 정의

```typescript
interface SymbolItem {
    id: string;           // 검색용 식별자
    symbol: string;       // 실제 기호
    description?: string; // 선택적 설명
}
```

### 플러그인 설정 인터페이스
**사용처**: 플러그인 전체 설정 데이터 구조 정의

```typescript
interface SymbolPluginSettings {
    triggerChar: string;
    fuzzySearch: boolean;
    highlight: boolean;
    showDescription: boolean;
    symbols: SymbolItem[];
}
```

### 제안 객체 인터페이스
**사용처**: 자동완성 제안 항목의 데이터 구조 정의

```typescript
interface SuggestionObject {
    symbolItem: SymbolItem;
    positions: number[];
}
```

### 기본 설정값
**사용처**: 플러그인 초기 설정 및 설정 로드 시 기본값으로 사용

```typescript
const DEFAULT_SETTINGS: SymbolPluginSettings = {
    triggerChar: "/",
    fuzzySearch: true,
    highlight: true,
    showDescription: true,
    symbols: [
        { id: "arrow-right", symbol: "→", description: "Right arrow" },
        { id: "arrow-left", symbol: "←", description: "Left arrow" },
        { id: "check", symbol: "✓", description: "Check mark" },
        { id: "cross", symbol: "✗", description: "Cross mark" },
        { id: "star", symbol: "★", description: "Filled star" },
        { id: "circle", symbol: "●", description: "Filled circle" },
        { id: "square", symbol: "■", description: "Filled square" },
        { id: "infinity", symbol: "∞", description: "Infinity" },
    ]
};
```

---

## 2. EditorSuggest 클래스 메서드

### onTrigger - 트리거 감지
**사용처**: 사용자가 트리거 문자를 입력했을 때 자동완성을 활성화할지 결정

```typescript
onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile | null
): EditorSuggestTriggerInfo | null {
    const currentLine = editor.getLine(cursor.line).slice(0, cursor.ch);

    if (!currentLine.contains(this.plugin.settings.triggerChar)) {
        return null;
    }

    const queryStart = currentLine.lastIndexOf(this.plugin.settings.triggerChar);
    const query = currentLine.slice(queryStart + 1, currentLine.length);
    
    return {
        start: {
            ...cursor,
            ch: queryStart,
        },
        end: cursor,
        query: query
    };
}
```

### fuzzyMatch - 퍼지 검색 알고리즘 (버그 수정 버전)
**사용처**: ID와 검색어를 퍼지 매칭하여 매칭 여부와 하이라이트 위치 반환

```typescript
fuzzyMatch(text: string, query: string) {
    let t = 0, q = 0;
    let positions: number[] = []
    text = text.toLowerCase();
    query = query.toLowerCase();

    while (t < text.length && q < query.length) {
        if (text[t] === query[q]) {
            if (this.plugin.settings.highlight) {
                positions.push(t);
            }
            q++;
        }
        t++;
    }

    if (q === query.length) {
        // return position if highlight enabled
        if (this.plugin.settings.highlight) {
            return positions;
        } else {
            return [];
        }
    } else {
        return false
    }
}
```

### getSuggestions - 제안 목록 생성
**사용처**: 검색어에 매칭되는 기호들을 필터링하여 제안 목록 반환

```typescript
getSuggestions(context: EditorSuggestContext): SuggestionObject[] | Promise<SuggestionObject[]> {
    const query = context.query;
    
    if (query.startsWith(" ")) {
        return []
    }

    const suggestions: SuggestionObject[] = [];

    for (let i = 0; i < this.plugin.settings.symbols.length; i++) {
        const symbolItem = this.plugin.settings.symbols[i];

        if (this.plugin.settings.fuzzySearch) {
            let positions = this.fuzzyMatch(symbolItem.id, query);
            if (positions) {
                suggestions.push({
                    symbolItem: symbolItem,
                    positions: positions
                });
            }
        } else {
            if (symbolItem.id.toLowerCase().contains(query.toLowerCase())) {
                suggestions.push({
                    symbolItem: symbolItem,
                    positions: []
                })
            }
        }
    }

    return suggestions;
}
```

### buildHighlighted - 하이라이트 HTML 생성
**사용처**: 매칭된 문자들을 굵게 표시한 HTML 문자열 생성

```typescript
buildHighlighted(text: string, positions: number[]) {
    let out = "";

    for (let i = 0; i < text.length; i++) {
        if (positions.includes(i)) {
            out += `<b class="symbol-fuzzy-match">${text[i]}</b>`;
        } else {
            out += text[i];
        }
    }

    return out;
}
```

### renderSuggestion - 제안 항목 렌더링
**사용처**: 자동완성 목록에 각 기호를 표시

```typescript
async renderSuggestion(suggestion: SuggestionObject, el: HTMLElement) {
    const item = suggestion.symbolItem;
    
    // ID와 기호를 같은 줄에 표시
    const mainLine = el.createEl("div", { cls: "symbol-main-line" });
    
    // ID (하이라이트)
    if (this.plugin.settings.highlight && suggestion.positions.length > 0) {
        const idEl = mainLine.createEl("span", { cls: "symbol-id" });
        idEl.innerHTML = this.buildHighlighted(item.id, suggestion.positions);
    } else {
        mainLine.createEl("span", { cls: "symbol-id", text: item.id });
    }
    
    // 기호 (크게 표시)
    mainLine.createEl("span", { cls: "symbol-char", text: item.symbol });
    
    // Description (옵션)
    if (this.plugin.settings.showDescription && item.description) {
        el.createEl("small", { cls: "symbol-desc", text: item.description });
    }
}
```

### selectSuggestion - 기호 삽입
**사용처**: 사용자가 제안을 선택했을 때 기호를 에디터에 삽입

```typescript
public selectSuggestion(result: SuggestionObject, evt: MouseEvent) {
    this.context?.editor.replaceRange(
        result.symbolItem.symbol,
        this.context.start,
        this.context.end
    );
    this.close();
}
```

---

## 3. Plugin 클래스 메서드

### onload - 플러그인 초기화
**사용처**: 플러그인 로드 시 설정 로드 및 자동완성 엔진 등록

```typescript
async onload() {
    await this.loadSettings();
    this.registerEditorSuggest(new SymbolSuggestions(this));
    this.addSettingTab(new SymbolPluginSettingTab(this.app, this));
}
```

### loadSettings - 설정 로드
**사용처**: 저장된 설정을 불러와 기본값과 병합

```typescript
async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}
```

### saveSettings - 설정 저장
**사용처**: 현재 설정을 파일에 저장

```typescript
async saveSettings() {
    await this.saveData(this.settings);
}
```

### onunload - 플러그인 정리
**사용처**: 플러그인 언로드 시 정리 작업 (자동 처리되므로 비어있음)

```typescript
onunload() {
    // Obsidian이 자동으로 등록된 것들을 정리함
}
```

---

## 4. SettingTab 클래스 - 설정 UI

### 트리거 문자 설정
**사용처**: 자동완성을 시작할 트리거 문자를 입력받고 한 글자로 제한

```typescript
new Setting(containerEl)
    .setName("Trigger Character")
    .setDesc("Enter a character that will trigger symbol suggestion")
    .addText((text) =>
        text
            .setPlaceholder("/")
            .setValue(this.plugin.settings.triggerChar)
            .onChange(async (value) => {
                if (value && value.length > 1) {
                    new Notice("Please use one character");
                    text.setValue(value[0]);
                } else {
                    this.plugin.settings.triggerChar = value;
                    await this.plugin.saveSettings();
                }
            })
    );
```

### 퍼지 검색 토글
**사용처**: 퍼지 검색 활성화/비활성화 설정

```typescript
new Setting(containerEl)
    .setName("Enable Fuzzy Search")
    .setDesc("Match symbols even if you don't type the exact ID")
    .addToggle((toggle) => {
        toggle
            .setValue(this.plugin.settings.fuzzySearch)
            .onChange(async (value) => {
                this.plugin.settings.fuzzySearch = value;
                await this.plugin.saveSettings();
            })
    });
```

### 하이라이트 토글
**사용처**: 검색어 매칭 부분 강조 표시 활성화/비활성화

```typescript
new Setting(containerEl)
    .setName("Highlight Matches")
    .setDesc("Highlight matching characters in search results")
    .addToggle((toggle) => {
        toggle
            .setValue(this.plugin.settings.highlight)
            .onChange(async (value) => {
                this.plugin.settings.highlight = value;
                await this.plugin.saveSettings();
            })
    });
```

### 설명 표시 토글
**사용처**: 제안 목록에 기호 설명 표시 활성화/비활성화

```typescript
new Setting(containerEl)
    .setName("Show Descriptions")
    .setDesc("Display symbol descriptions in the suggestion list")
    .addToggle((toggle) => {
        toggle
            .setValue(this.plugin.settings.showDescription)
            .onChange(async (value) => {
                this.plugin.settings.showDescription = value;
                await this.plugin.saveSettings();
            })
    });
```

---

## 5. 유틸리티 함수

### ID 중복 검사
**사용처**: 기호 추가/수정 시 ID가 중복되지 않는지 검증

```typescript
function validateSymbolId(id: string, currentIndex: number, symbols: SymbolItem[]): boolean {
    return !symbols.some((item, index) => 
        index !== currentIndex && item.id === id
    );
}
```

### 프리셋 정의
**사용처**: 자주 사용하는 기호 세트를 미리 정의하여 빠른 가져오기 지원

```typescript
const PRESETS: Record<string, SymbolItem[]> = {
    arrows: [
        { id: "arrow-right", symbol: "→", description: "Right arrow" },
        { id: "arrow-left", symbol: "←", description: "Left arrow" },
        { id: "arrow-up", symbol: "↑", description: "Up arrow" },
        { id: "arrow-down", symbol: "↓", description: "Down arrow" },
        { id: "arrow-double", symbol: "⇒", description: "Double arrow" },
    ],
    checkmarks: [
        { id: "check", symbol: "✓", description: "Check mark" },
        { id: "check-heavy", symbol: "✔", description: "Heavy check" },
        { id: "cross", symbol: "✗", description: "Cross mark" },
        { id: "cross-heavy", symbol: "✘", description: "Heavy cross" },
        { id: "checkbox-empty", symbol: "☐", description: "Empty checkbox" },
        { id: "checkbox-checked", symbol: "☑", description: "Checked box" },
        { id: "checkbox-crossed", symbol: "☒", description: "Crossed box" },
    ],
    stars: [
        { id: "star-filled", symbol: "★", description: "Filled star" },
        { id: "star-empty", symbol: "☆", description: "Empty star" },
        { id: "circle-filled", symbol: "●", description: "Filled circle" },
        { id: "circle-empty", symbol: "○", description: "Empty circle" },
        { id: "square-filled", symbol: "■", description: "Filled square" },
        { id: "square-empty", symbol: "□", description: "Empty square" },
    ],
    math: [
        { id: "plus-minus", symbol: "±", description: "Plus minus" },
        { id: "multiply", symbol: "×", description: "Multiply" },
        { id: "divide", symbol: "÷", description: "Divide" },
        { id: "approx", symbol: "≈", description: "Approximately" },
        { id: "not-equal", symbol: "≠", description: "Not equal" },
        { id: "less-equal", symbol: "≤", description: "Less than or equal" },
        { id: "greater-equal", symbol: "≥", description: "Greater than or equal" },
        { id: "infinity", symbol: "∞", description: "Infinity" },
    ],
    currency: [
        { id: "dollar", symbol: "$", description: "Dollar" },
        { id: "euro", symbol: "€", description: "Euro" },
        { id: "pound", symbol: "£", description: "Pound" },
        { id: "yen", symbol: "¥", description: "Yen" },
        { id: "won", symbol: "₩", description: "Won" },
    ]
};
```

### 프리셋 가져오기 함수
**사용처**: 선택한 프리셋의 기호들을 현재 설정에 추가

```typescript
async importPreset(presetName: string) {
    const preset = PRESETS[presetName];
    if (preset) {
        this.plugin.settings.symbols.push(...preset);
        await this.plugin.saveSettings();
        this.display(); // UI 새로고침
        new Notice(`Imported ${preset.length} symbols from ${presetName}`);
    }
}
```

---

## 6. 전체 클래스 구조

### EditorSuggest 클래스 전체 구조
**사용처**: 자동완성 기능의 핵심 클래스

```typescript
class SymbolSuggestions extends EditorSuggest<SuggestionObject> {
    private plugin: SymbolPlugin;

    constructor(plugin: SymbolPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
        // 위 코드 참조
    }

    fuzzyMatch(text: string, query: string) {
        // 위 코드 참조
    }

    getSuggestions(context: EditorSuggestContext): SuggestionObject[] | Promise<SuggestionObject[]> {
        // 위 코드 참조
    }

    buildHighlighted(text: string, positions: number[]) {
        // 위 코드 참조
    }

    async renderSuggestion(suggestion: SuggestionObject, el: HTMLElement) {
        // 위 코드 참조
    }

    public selectSuggestion(result: SuggestionObject, evt: MouseEvent) {
        // 위 코드 참조
    }

    public unload(): void {
        // 비어있음
    }
}
```

### Plugin 클래스 전체 구조
**사용처**: 플러그인의 메인 클래스

```typescript
export default class SymbolPlugin extends Plugin {
    settings: SymbolPluginSettings;

    async onload() {
        // 위 코드 참조
    }

    onunload() {
        // 위 코드 참조
    }

    async loadSettings() {
        // 위 코드 참조
    }

    async saveSettings() {
        // 위 코드 참조
    }
}
```

### SettingTab 클래스 기본 구조
**사용처**: 설정 UI를 구성하는 클래스

```typescript
class SymbolPluginSettingTab extends PluginSettingTab {
    plugin: SymbolPlugin;

    constructor(app: App, plugin: SymbolPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        // 여기에 위의 설정 UI 코드들을 추가
        // new Setting(containerEl)...
    }
}
```

---

## 7. CSS 클래스 (styles.css에 추가)

### 제안 항목 스타일
**사용처**: 자동완성 제안 목록의 시각적 스타일 정의

```css
/* 메인 라인 (ID + 기호) */
.symbol-main-line {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* ID 텍스트 */
.symbol-id {
    font-family: var(--font-monospace);
    color: var(--text-normal);
}

/* 기호 문자 */
.symbol-char {
    font-size: 1.5em;
    font-weight: bold;
    color: var(--text-accent);
}

/* 퍼지 매칭 하이라이트 */
.symbol-fuzzy-match {
    color: var(--text-accent);
    font-weight: bold;
}

/* 설명 텍스트 */
.symbol-desc {
    color: var(--text-muted);
    font-size: 0.9em;
    margin-top: 2px;
}
```

---

## 8. 사용 예시

### 플러그인 초기화 흐름
```
1. main.ts에서 SymbolPlugin 클래스를 export default
2. onload()에서 설정 로드 및 EditorSuggest 등록
3. 사용자가 에디터에서 "/" 입력
4. onTrigger()가 호출되어 자동완성 활성화
5. getSuggestions()로 매칭되는 기호 목록 생성
6. renderSuggestion()으로 각 항목 표시
7. 사용자가 항목 선택
8. selectSuggestion()으로 기호 삽입
```

### 검색 알고리즘 선택 흐름
```
if (plugin.settings.fuzzySearch) {
    // fuzzyMatch() 사용: "arr" → "arrow-right"
} else {
    // contains() 사용: "arrow" → "arrow-right"
}
```

### 하이라이트 표시 흐름
```
if (plugin.settings.highlight && positions.length > 0) {
    // buildHighlighted()로 HTML 생성
    // innerHTML로 표시
} else {
    // 일반 텍스트로 표시
}
```
