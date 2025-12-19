import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    TFile,
} from "obsidian";

// ========================================
// 인터페이스 정의
// ========================================

// 각 기호 항목의 데이터 구조
interface SymbolItem {
    id: string;           // 검색용 식별자
    symbol: string;       // 실제 기호
}

// 플러그인 전체 설정 데이터 구조
interface SymbolPluginSettings {
    triggerChar: string;
    fuzzySearch: boolean;
    highlight: boolean;
    symbols: SymbolItem[];
}

// 자동완성 제안 항목의 데이터 구조
interface SuggestionObject {
    symbolItem: SymbolItem;
    positions: number[];
}

// 기본 설정값
const DEFAULT_SETTINGS: SymbolPluginSettings = {
    triggerChar: "/",
    fuzzySearch: true,
    highlight: true,
    symbols: [] // 사용자가 직접 추가
};



// ========================================
// EditorSuggest 클래스 - 자동완성 기능
// ========================================

class SymbolSuggestions extends EditorSuggest<SuggestionObject> {
    private plugin: SymbolPlugin;

    constructor(plugin: SymbolPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    // 트리거 감지: 사용자가 트리거 문자를 입력했을 때 자동완성 활성화
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

    // 퍼지 검색 알고리즘: ID와 검색어를 퍼지 매칭
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
            // 하이라이트가 활성화된 경우 위치 반환
            if (this.plugin.settings.highlight) {
                return positions;
            } else {
                return [];
            }
        } else {
            return false
        }
    }

    // 제안 목록 생성: 검색어에 매칭되는 기호들 필터링
    getSuggestions(context: EditorSuggestContext): SuggestionObject[] | Promise<SuggestionObject[]> {
        const query = context.query;
        
        // 공백으로 시작하면 제안 안 함
        if (query.startsWith(" ")) {
            return []
        }

        const suggestions: SuggestionObject[] = [];

        for (let i = 0; i < this.plugin.settings.symbols.length; i++) {
            const symbolItem = this.plugin.settings.symbols[i];

            if (this.plugin.settings.fuzzySearch) {
                // 퍼지 검색 모드
                let positions = this.fuzzyMatch(symbolItem.id, query);
                if (positions) {
                    suggestions.push({
                        symbolItem: symbolItem,
                        positions: positions
                    });
                }
            } else {
                // 일반 검색 모드
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

    // 하이라이트 HTML 생성: 매칭된 문자들을 굵게 표시
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

    // 제안 항목 렌더링: 자동완성 목록에 각 기호 표시
    async renderSuggestion(suggestion: SuggestionObject, el: HTMLElement) {
        const item = suggestion.symbolItem;
        
        // ID (하이라이트)
        if (this.plugin.settings.highlight && suggestion.positions.length > 0) {
            const idEl = el.createEl("span");
            idEl.innerHTML = this.buildHighlighted(item.id, suggestion.positions);
        } else {
            el.createEl("span", { text: item.id });
        }
        
        // 기호
        el.createEl("span", { text: ` ${item.symbol}` });
    }

    // 기호 삽입: 사용자가 제안을 선택했을 때 에디터에 기호 삽입
    public selectSuggestion(result: SuggestionObject, evt: MouseEvent | KeyboardEvent) {
        if (this.context) {
            this.context.editor.replaceRange(
                result.symbolItem.symbol,
                this.context.start,
                this.context.end
            );
        }
        this.close();
    }
}

// ========================================
// Plugin 클래스 - 플러그인 메인
// ========================================

export default class SymbolPlugin extends Plugin {
    settings: SymbolPluginSettings;

    // 플러그인 로드 시 초기화
    async onload() {
        await this.loadSettings();
        this.registerEditorSuggest(new SymbolSuggestions(this));
        this.addSettingTab(new SymbolPluginSettingTab(this.app, this));
    }

    // 플러그인 언로드
    onunload() {
        // Obsidian이 자동으로 등록된 것들을 정리함
    }

    // 설정 로드: 저장된 설정을 불러와 기본값과 병합
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    // 설정 저장: 현재 설정을 파일에 저장
    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// ========================================
// SettingTab 클래스 - 설정 UI
// ========================================

class SymbolPluginSettingTab extends PluginSettingTab {
    plugin: SymbolPlugin;

    constructor(app: App, plugin: SymbolPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "기호 입력 플러그인 설정" });

        // ========================================
        // 1. 기본 설정 섹션
        // ========================================

        containerEl.createEl("h3", { text: "기본 설정" });

        // 트리거 문자 설정
        new Setting(containerEl)
            .setName("트리거 문자")
            .setDesc("기호 제안을 시작할 문자를 입력하세요")
            .addText((text) =>
                text
                    .setPlaceholder("/")
                    .setValue(this.plugin.settings.triggerChar)
                    .onChange(async (value) => {
                        if (value && value.length > 1) {
                            new Notice("한 글자만 사용해주세요");
                            text.setValue(value[0]);
                        } else {
                            this.plugin.settings.triggerChar = value;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // 퍼지 검색 토글
        new Setting(containerEl)
            .setName("퍼지 검색 활성화")
            .setDesc("정확한 ID를 입력하지 않아도 기호를 매칭합니다 (예: 'arr' → 'arrow')")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.fuzzySearch)
                    .onChange(async (value) => {
                        this.plugin.settings.fuzzySearch = value;
                        await this.plugin.saveSettings();
                    })
            });

        // 하이라이트 토글
        new Setting(containerEl)
            .setName("매칭 하이라이트")
            .setDesc("검색 결과에서 매칭된 문자를 강조 표시합니다")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.highlight)
                    .onChange(async (value) => {
                        this.plugin.settings.highlight = value;
                        await this.plugin.saveSettings();
                    })
            });

        // ========================================
        // 2. 기호 추가 섹션
        // ========================================

        containerEl.createEl("h3", { text: "새 기호 추가" });

        new Setting(containerEl)
            .setName("기호 추가")
            .setDesc("자주 사용하는 기호를 추가하세요")
            .addButton((button) => {
                button
                    .setButtonText("+ 새 기호")
                    .onClick(async () => {
                        this.plugin.settings.symbols.push({
                            id: "",
                            symbol: ""
                        });
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        // ========================================
        // 3. 기호 목록 섹션
        // ========================================

        containerEl.createEl("h3", { text: "기호 목록" });

        // 기호가 없을 때
        if (this.plugin.settings.symbols.length === 0) {
            const emptyDiv = containerEl.createDiv({ cls: "setting-item" });
            const emptyDesc = emptyDiv.createDiv({ cls: "setting-item-description" });
            emptyDesc.setText("추가된 기호가 없습니다. '+ 새 기호' 버튼을 눌러 시작하세요.");
        }

        // 각 기호 항목 표시
        this.plugin.settings.symbols.forEach((symbolItem, index) => {
            // ID 입력 (버튼 포함)
            const idSetting = new Setting(containerEl)
                .setName("ID")
                .setDesc(`기호 #${index + 1} - 검색용 식별자`);

            idSetting.addText((text) => {
                text
                    .setPlaceholder("arrow")
                    .setValue(symbolItem.id)
                    .onChange(async (value) => {
                        // 중복 체크
                        const isDuplicate = this.plugin.settings.symbols.some(
                            (item, idx) => idx !== index && item.id === value
                        );
                        
                        if (isDuplicate && value !== "") {
                            new Notice("이미 사용 중인 ID입니다");
                        } else {
                            symbolItem.id = value;
                            await this.plugin.saveSettings();
                        }
                    });
            });

            // 위로 이동 버튼
            if (index > 0) {
                idSetting.addExtraButton((button) => {
                    button
                        .setIcon("up-chevron-glyph")
                        .setTooltip("위로 이동")
                        .onClick(async () => {
                            const temp = this.plugin.settings.symbols[index];
                            this.plugin.settings.symbols[index] = this.plugin.settings.symbols[index - 1];
                            this.plugin.settings.symbols[index - 1] = temp;
                            await this.plugin.saveSettings();
                            this.display();
                        });
                });
            }

            // 아래로 이동 버튼
            if (index < this.plugin.settings.symbols.length - 1) {
                idSetting.addExtraButton((button) => {
                    button
                        .setIcon("down-chevron-glyph")
                        .setTooltip("아래로 이동")
                        .onClick(async () => {
                            const temp = this.plugin.settings.symbols[index];
                            this.plugin.settings.symbols[index] = this.plugin.settings.symbols[index + 1];
                            this.plugin.settings.symbols[index + 1] = temp;
                            await this.plugin.saveSettings();
                            this.display();
                        });
                });
            }

            // 삭제 버튼
            idSetting.addExtraButton((button) => {
                button
                    .setIcon("trash")
                    .setTooltip("삭제")
                    .onClick(async () => {
                        this.plugin.settings.symbols.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                        new Notice("기호가 삭제되었습니다");
                    });
            });

            // Symbol 입력
            new Setting(containerEl)
                .setName("기호")
                .setDesc("실제 기호 문자")
                .addText((text) => {
                    text
                        .setPlaceholder("→")
                        .setValue(symbolItem.symbol)
                        .onChange(async (value) => {
                            symbolItem.symbol = value;
                            await this.plugin.saveSettings();
                        });
                });

            // 구분선 추가
            if (index < this.plugin.settings.symbols.length - 1) {
                containerEl.createEl("hr", { cls: "symbol-divider" });
            }
        });
    }
}
