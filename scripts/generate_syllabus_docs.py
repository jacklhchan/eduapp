from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.curriculum_catalog import (  # noqa: E402
    CURRICULUM_SOURCES,
    CURRICULUM_STAGES,
    CURRICULUM_SUBJECTS,
    subjects_for_grade,
)


GRADE_ORDER = ["K1", "K2", "K3", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"]
GRADE_STAGE = {
    "K1": "kg",
    "K2": "kg",
    "K3": "kg",
    "P1": "p1-p6",
    "P2": "p1-p6",
    "P3": "p1-p6",
    "P4": "p1-p6",
    "P5": "p1-p6",
    "P6": "p1-p6",
    "S1": "s1-s3",
    "S2": "s1-s3",
    "S3": "s1-s3",
    "S4": "s4-s6",
    "S5": "s4-s6",
    "S6": "s4-s6",
}

STAGE_EDB_CONTENT = {
    "kg": {
        "source": "EDB Kindergarten Education overview and Kindergarten Education Curriculum Guide direction.",
        "learning_focus": [
            "以兒童為本，尊重幼兒發展差異，透過遊戲、生活化主題和綜合活動學習。",
            "五項發展目標涵蓋品德、認知和語言、身體、情意和群性、美感發展。",
            "六個學習範疇共同承載價值觀和態度、技能、知識，重點是學習興趣、自信和自理能力。",
        ],
    },
    "p1-p6": {
        "source": "EDB Primary Education Curriculum Guide (2024), KLA curriculum documents, and 2025/26 subject implementation notes.",
        "learning_focus": [
            "小學階段建基於八個學習領域，強調兩文三語、探究思維、價值觀、身心健康和自主學習。",
            "2025/26 起小學科學和小學人文先在 P1、P4 推行，並於 2027/28 延展至所有級別，逐步取代常識科。",
            "科技教育包括運算思維和編程；高小公開資助學校採用加強編程教育單元。",
        ],
    },
    "s1-s3": {
        "source": "EDB Secondary Education Curriculum Guide (2017), KLA guides, and 2025/26 subject implementation notes.",
        "learning_focus": [
            "初中以八個學習領域銜接高中，重點是建立學科基礎、共通能力、價值觀和生涯選科準備。",
            "中國歷史由 2018/19 起為初中獨立必修科；學校須安排相應課時。",
            "公民、經濟與社會由 2024/25 起在 S1 推行，並逐步取代生活與社會；內容覆蓋個人與社會發展、資源與經濟活動、社會制度與公民。",
        ],
    },
    "s4-s6": {
        "source": "EDB Senior Secondary curriculum framework and subject Curriculum and Assessment Guides.",
        "learning_focus": [
            "高中課程由核心科目、選修科、應用學習、其他語言和其他學習經歷組成。",
            "其他學習經歷包括價值觀教育、社會服務、藝術發展、體育發展和與工作有關的經驗。",
            "應用學習涵蓋創意學習、媒體及傳意、商業管理及法律、服務、應用科學、工程及生產等六個範疇。",
        ],
    },
}

KLA_EDB_CONTENT = {
    "kindergarten": {
        "aims": [
            "促進德、智、體、群、美均衡發展。",
            "透過生活經驗和遊戲建立學習興趣、正面價值觀、自信心和自理能力。",
        ],
        "content": [
            ("Values and attitudes", "在日常情境中培育良好生活習慣、關愛、責任感和合作態度。"),
            ("Skills", "發展語言、感知、動作、自理、社交、觀察和初步解難能力。"),
            ("Knowledge", "從家庭、學校、社區、大自然和藝術經驗中建立初步概念。"),
        ],
        "evidence": [
            "生活主題觀察記錄、遊戲照片、作品集、教師/家長觀察。",
            "以成長證據和習慣建立為主，不以操練式測驗作主要證據。",
        ],
    },
    "chinese-language": {
        "aims": [
            "發展聽、說、讀、寫能力，並透過語文學習培養審美、文化認同和思維能力。",
            "把語文知識、文學文化、品德情意和自主學習結合，支援跨學科學習。",
        ],
        "content": [
            ("Reading", "理解不同文類和篇章，掌握重點、結構、語境、作者態度和文化內涵。"),
            ("Writing", "按目的、對象和文體組織內容，逐步發展敘述、描寫、說明、議論和創意表達。"),
            ("Listening and speaking", "理解口語訊息，清楚表達、互動回應，並按場景使用恰當語氣和詞彙。"),
            ("Literature and culture", "接觸文學作品和中華文化元素，培養審美、價值判斷和文化連結。"),
        ],
        "evidence": [
            "閱讀理解、作文/改寫、口語紀錄、默書與字詞運用、文學或文化回應。",
            "OCR 回饋需保留原題證據，AI 只產生原創練習和回饋，不複製教材內容。",
        ],
    },
    "english-language": {
        "aims": [
            "透過 Interpersonal、Knowledge、Experience 三個互相關連的 strand 發展英語能力。",
            "把聽、說、讀、寫、語法、詞彙、閱讀策略和正面價值觀整合於真實任務。",
        ],
        "content": [
            ("Interpersonal Strand", "建立和維持關係、交流資訊和意見、完成日常溝通任務。"),
            ("Knowledge Strand", "搜尋、理解、詮釋和運用資訊，表達和應用意念，解決問題。"),
            ("Experience Strand", "回應真實和想像經驗，透過故事、詩歌、戲劇、媒體文本作表達。"),
            ("Language skills", "綜合閱讀、寫作、聆聽、說話、語法、詞彙和資訊素養。"),
        ],
        "evidence": [
            "reading logs, vocabulary use, writing drafts, oral recordings, task-based communication.",
            "App practice should blend skill work with meaningful text contexts rather than isolated drills only.",
        ],
    },
    "mathematics": {
        "aims": [
            "建立數學概念、技能、運算能力、推理和解難能力，並把數學應用於日常生活。",
            "小學以五個 strand 組織；中學逐步整合為 Number and Algebra、Measures/Shape/Space、Data Handling 等方向。",
        ],
        "content": [
            ("Number", "數、四則運算、分數、小數、百分數、倍數因數和量的關係。"),
            ("Algebra", "以符號表示數量和關係，建立代數式、方程和函數前備概念。"),
            ("Measures", "長度、重量、容量、時間、金錢、面積、體積、速度和量度估算。"),
            ("Shape and Space", "平面圖形、立體圖形、角、方向、位置、對稱和幾何關係。"),
            ("Data Handling", "收集、分類、表列、統計圖、平均數、數據詮釋和圖表判讀。"),
        ],
        "evidence": [
            "以學習單、運算步驟、錯因模式、圖表判讀和文字題解題策略作 mastery evidence。",
            "自動出題必須原創，並標記 strand、grade、learning node id 和家長確認狀態。",
        ],
    },
    "science": {
        "aims": [
            "建立科學知識基礎、科學素養、探究精神、證據為本思維和 STEAM 應用能力。",
            "小學科學以好奇探究、學以致用、創新未來為課程理念；初中和高中銜接更深入的科學概念和探究方法。",
        ],
        "content": [
            ("Life and Environment", "人體健康、生物特徵、生命延續、生物與環境互動、生態系統、微觀世界。"),
            ("Matter, Energy and Changes", "物質性質與變化、能量形式與轉移、力與運動。"),
            ("Earth and Space", "地球特徵和資源、氣候與季節、太陽系與宇宙。"),
            ("Science, Technology, Engineering and Society", "科學過程、科學精神、航天與創新科技、工程與設計。"),
            ("Inquiry process", "以 Plan, Do, Analyse, Review 逐步建立觀察、量度、記錄、推論和反思能力。"),
        ],
        "evidence": [
            "實驗/探究記錄、觀察相片、數據表、工程設計草圖、解釋與反思。",
            "AI 回饋應分辨概念知識、探究技能、科學態度和安全風險。",
        ],
    },
    "technology": {
        "aims": [
            "讓學生理解科技、生活、社會和環境的互動，並以設計、製作、運算思維和資訊素養解決問題。",
            "初中科技教育涵蓋 ICT、材料與結構、營運與製造、策略與管理、系統與控制、科技與生活等知識情境。",
        ],
        "content": [
            ("ICT and data", "資訊處理、數據、網絡、媒體素養、數碼安全和科技應用。"),
            ("Design and making", "設計流程、材料特性、結構、原型、測試、改良和用戶需要。"),
            ("Systems and control", "輸入、處理、輸出、控制、感測、邏輯和自動化概念。"),
            ("Technology and society", "科技對家庭、工作、環境、經濟和生活質素的影響。"),
            ("Computational thinking", "高小編程、初中 AI 模組、演算法、分解、模式和抽象化。"),
        ],
        "evidence": [
            "專題設計、編程作品、原型照片、流程圖、測試紀錄和反思。",
            "App tagging should include problem context, technology process, product artefact, and ethical/social implications.",
        ],
    },
    "pshe": {
        "aims": [
            "透過個人、社會及人文教育建立身份認同、社會理解、人文素養、歷史意識、空間與環境理解和經濟概念。",
            "PSHE 六個 strand 包括個人與社會發展、時間/延續/轉變、文化與承傳、地方與環境、資源與經濟活動、社會制度與公民。",
        ],
        "content": [
            ("Personal and Social Development", "自我認識、人際關係、價值觀、生活技能、社會責任。"),
            ("Time, Continuity and Change", "歷史時序、變遷、因果、證據和歷史觀點。"),
            ("Culture and Heritage", "本地、國家和世界文化承傳，文化理解與尊重。"),
            ("Place and Environment", "地方、空間、環境、人地互動和可持續發展。"),
            ("Resources and Economic Activities", "資源運用、生產、消費、市場、個人理財和經濟選擇。"),
            ("Social Systems and Citizenship", "社會制度、公民權責、法治、國家和香港關係、全球議題。"),
        ],
        "evidence": [
            "資料研習、地圖/圖表、歷史證據分析、議題探究、反思短文和專題報告。",
            "AI 回饋要標記資料來源、觀點和推論，避免把單一觀點當成唯一答案。",
        ],
    },
    "arts": {
        "aims": [
            "透過創作、演奏/展示、欣賞和藝術情境培養美感、創意、表達、文化理解和反思。",
            "音樂和視覺藝術均重視知識、技能、價值觀和態度的整合，以及學生個人創意發展。",
        ],
        "content": [
            ("Creating", "構思、試驗媒介/聲音/視覺元素、發展作品並作修訂。"),
            ("Performing / Presenting", "以音樂演奏、歌唱、展出或視覺呈現方式表達意念。"),
            ("Appreciating", "觀察、描述、分析和評價作品，理解風格、語境和創作者意圖。"),
            ("Arts in context", "連繫本地、中華和世界藝術文化，理解藝術與生活/社會的關係。"),
        ],
        "evidence": [
            "作品照片、演出錄音/影片、創作草稿、欣賞筆記、策展或反思紀錄。",
            "Portfolio should preserve process evidence, not just final artefact.",
        ],
    },
    "physical-education": {
        "aims": [
            "透過體育活動發展體能、運動技能、健康知識、安全意識、合作精神和正面價值觀。",
            "PE 學習不只看比賽成績，亦包括參與、健康生活方式、運動知識和反思。",
        ],
        "content": [
            ("Motor and sports skills", "基本動作、遊戲技能、球類、田徑、體操、舞蹈或戶外活動。"),
            ("Health and fitness", "體適能、健康生活、身體活動習慣、營養和安全。"),
            ("Sports knowledge", "規則、策略、器材、安全、觀察和自我評估。"),
            ("Values and attitudes", "公平競賽、合作、堅毅、尊重和責任感。"),
        ],
        "evidence": [
            "技能觀察、體適能紀錄、活動參與、反思、自我目標和教師評語。",
            "App should avoid ranking-only feedback; focus on progress, safety and habits.",
        ],
    },
    "cross-curricular": {
        "aims": [
            "支援跨學科學習、應用學習、其他語言和不同學習經歷。",
            "讓學生把知識、技能、價值觀和生涯發展連結到真實情境。",
        ],
        "content": [
            ("Applied contexts", "職業相關、服務、創意、媒體、商業、工程、應用科學等真實任務。"),
            ("Language and culture", "其他語言學習連結文化、溝通和國際視野。"),
            ("Other learning experiences", "價值觀教育、社會服務、藝術、體育和與工作有關的經驗。"),
        ],
        "evidence": [
            "課程作品、實務任務、專題、反思、證書、實地學習或服務紀錄。",
            "Portfolio should connect evidence to aspiration, strengths and next-step learning.",
        ],
    },
}

SUBJECT_EDB_CONTENT = {
    "kg-physical-fitness-health": {
        "aims": ["建立大肌肉活動、感官協調、健康生活習慣和基本安全意識。"],
        "content": [
            ("Gross motor", "跑、跳、平衡、投擲、攀爬等基本動作和身體協調。"),
            ("Health habits", "清潔、飲食、休息、如廁、自理和日常健康習慣。"),
            ("Safety awareness", "校園/家居/戶外安全、身體界線和求助方法。"),
        ],
    },
    "kg-language": {
        "aims": ["以聆聽、說話、故事、兒歌和早期閱讀建立語文興趣和表達信心。"],
        "content": [
            ("Listening", "聽懂日常指令、故事和同伴分享，作出合適回應。"),
            ("Speaking", "用詞語和短句表達需要、經驗、感受和想法。"),
            ("Early literacy", "認識圖書、圖像、文字方向、常見字詞和閱讀興趣。"),
        ],
    },
    "kg-early-childhood-mathematics": {
        "aims": ["從遊戲和生活情境建立數量、形狀、空間、規律和分類的初步概念。"],
        "content": [
            ("Number sense", "數數、比較多少、配對、一一對應和簡單排序。"),
            ("Shape and space", "辨認常見形狀、位置、方向和空間關係。"),
            ("Patterns", "分類、配對、排序、規律和簡單量度比較。"),
        ],
    },
    "kg-nature-living": {
        "aims": ["透過觀察、探索和生活主題認識自然、環境、身邊物件和社區生活。"],
        "content": [
            ("Observation", "觀察天氣、植物、動物、物料和日常現象。"),
            ("Everyday inquiry", "提出問題、比較、分類、預測和以簡單方式記錄。"),
            ("Living environment", "關心家校社區、環境保護和健康生活。"),
        ],
    },
    "kg-self-society": {
        "aims": ["發展自我照顧、情緒表達、人際相處、家庭/學校/社區角色和正面價值觀。"],
        "content": [
            ("Self-care", "穿脫、整理物品、表達需要和照顧個人衛生。"),
            ("Social skills", "輪候、分享、合作、道歉、感謝和解決小衝突。"),
            ("Values and attitudes", "守規、關愛、尊重、責任感和歸屬感。"),
        ],
    },
    "kg-arts-creativity": {
        "aims": ["透過音樂、律動、視覺創作和假想遊戲發展美感、創意和表達。"],
        "content": [
            ("Visual expression", "繪畫、拼貼、塑形、顏色、線條和材料探索。"),
            ("Music", "唱遊、節奏、聲音探索、律動和聆賞。"),
            ("Creative play", "角色扮演、故事創作、即興和合作創作。"),
        ],
    },
    "putonghua": {
        "aims": ["培養普通話聆聽、說話、拼音/語音知識和日常溝通能力。"],
        "content": [
            ("Listening", "理解普通話日常語句、課堂指令和簡短說話。"),
            ("Speaking", "以較準確聲母、韻母、聲調作朗讀、對話和表達。"),
            ("Communication", "在學校和生活情境中運用普通話作互動。"),
        ],
    },
    "chinese-literature": {
        "aims": ["透過文學作品閱讀和評論深化中國語文、文化、審美和批判思考。"],
        "content": [
            ("Literary appreciation", "分析詩、詞、散文、小說、戲劇等作品的形象、情感、結構和語言。"),
            ("Critical response", "比較作品觀點，提出有文本根據的評論。"),
            ("Culture", "連繫文學傳統、文化價值和歷史語境。"),
        ],
    },
    "literature-in-english": {
        "aims": ["發展英語文學閱讀、欣賞、詮釋和有根據的批評能力。"],
        "content": [
            ("Poetry", "分析意象、聲音、節奏、語氣和主題。"),
            ("Prose", "分析敘事、人物、情節、視角和語言風格。"),
            ("Drama", "理解衝突、舞台效果、對白、人物互動和表演語境。"),
        ],
    },
    "primary-science": {
        "aims": ["以小學科學 2025 課程框架建立四個 strand、15 個 theme、科學探究和工程設計。"],
        "content": [
            ("Life and Environment", "Human Health, Characteristics of Living Things, Continuation of Life, ecosystem and microscopic world."),
            ("Matter, Energy and Changes", "Properties and changes of matter, forms of energy and transfer, force and motion."),
            ("Earth and Space", "Earth resources, climate and seasons, solar system and universe."),
            ("Science, Technology, Engineering and Society", "Scientific process, aerospace and innovative technology, engineering and design."),
            ("Science inquiry and engineering design", "Use Plan, Do, Analyse, Review inquiry steps and design-test-improve engineering cycles."),
        ],
    },
    "science": {
        "aims": ["初中科學承接小學探究，建立綜合科學概念、STSE 連結、實驗技能和高中科學選科基礎。"],
        "content": [
            ("Scientific investigation", "提出問題、控制變項、量度、記錄、分析、解釋和評估實驗。"),
            ("Life and living", "細胞、生命過程、生物多樣性、健康和生態。"),
            ("Matter and energy", "粒子模型、物質性質、能量轉換、力、電、光、聲、熱。"),
            ("STSE", "科學、科技、社會和環境議題，連結日常生活和可持續發展。"),
        ],
    },
    "biology": {
        "aims": ["高中生物聚焦生命系統、細胞與分子、生物體、遺傳、演化和生態。"],
        "content": [
            ("Cells and molecules", "細胞結構、代謝、酶、光合作用、呼吸和分子基礎。"),
            ("Organisms", "營養、氣體交換、運輸、協調、繁殖和健康。"),
            ("Genetics and evolution", "遺傳、變異、DNA、基因技術和演化概念。"),
            ("Ecology", "生態系統、能量流、物質循環、人類影響和保育。"),
        ],
    },
    "chemistry": {
        "aims": ["高中化學建立物質、粒子、反應、能量、定量和材料世界的理解。"],
        "content": [
            ("Atomic world", "原子、電子排列、元素週期表、鍵合和結構。"),
            ("Materials", "金屬、聚合物、碳化合物、日常材料和環境影響。"),
            ("Reactions", "酸鹼、氧化還原、反應速率、能量變化和化學平衡基礎。"),
            ("Quantitative chemistry", "摩爾、濃度、化學方程、滴定和數據分析。"),
        ],
    },
    "physics": {
        "aims": ["高中物理建立力學、能量、波動、電磁和現代物理的概念及建模能力。"],
        "content": [
            ("Mechanics", "運動、力、牛頓定律、動量、功、能量和圓周/引力相關概念。"),
            ("Electricity", "電路、電流電壓、電阻、功率、電磁現象和應用。"),
            ("Waves", "波動性質、聲、光、干涉/衍射基礎和波的應用。"),
            ("Energy", "能量轉換、熱、輻射、能源科技和可持續議題。"),
        ],
    },
    "general-studies": {
        "aims": ["常識科在過渡期整合個人、社會、科學、科技、健康和社區學習，並逐步由小學科學/人文承接。"],
        "content": [
            ("Personal and social", "自我、家庭、學校、人際、社區、香港、國家和世界。"),
            ("Science and technology", "自然現象、物料、能量、科技應用、環境和健康。"),
            ("Health and community", "健康生活、安全、公民責任和資源運用。"),
        ],
    },
    "primary-humanities": {
        "aims": ["小學人文承接常識科的人文和社會內容，建立自我、社群、國家、文化和全球意識。"],
        "content": [
            ("Self and society", "自我管理、人際關係、家庭、學校和社區角色。"),
            ("Country and culture", "香港與國家、歷史文化、國民身份和中華文化。"),
            ("Community and world", "本地社區、世界連繫、資源運用和可持續發展。"),
        ],
    },
    "technology-education": {
        "aims": ["P1/P4 和初中科技教育建立 ICT、設計製作、材料、控制、生活科技和編程/AI 基礎。"],
        "content": [
            ("ICT", "資料處理、數碼工具、資訊素養、網絡安全和負責任使用科技。"),
            ("Materials and structures", "材料特性、結構、製作、測試和改良。"),
            ("Systems and control", "輸入/輸出、控制、感測、邏輯、模型和自動化。"),
            ("Technology and living", "家庭、食物、衣物、資源管理和科技對生活的影響。"),
        ],
    },
    "business-accounting-financial-studies": {
        "aims": ["高中 BAFS 建立商業環境、管理、會計、財務和企業精神的基礎。"],
        "content": [
            ("Business environment", "商業功能、企業、管理、市場、營運和商業倫理。"),
            ("Accounting", "會計原理、記錄、財務報表、分析和內部控制。"),
            ("Financial management", "個人/企業財務、投資、風險、資金管理和決策。"),
        ],
    },
    "design-and-applied-technology": {
        "aims": ["高中 DAT 以設計思維、科技應用、材料、系統和產品開發解決真實問題。"],
        "content": [
            ("Design process", "需要分析、研究、構思、原型、測試、評估和改良。"),
            ("Materials and systems", "材料、製造、結構、機械/電子系統和控制。"),
            ("Technology application", "產品、環境、用戶、人因、安全、可持續和社會影響。"),
        ],
    },
    "health-management-social-care": {
        "aims": ["高中 HMSC 連結健康、社會關懷、社區服務、生活質素和社會支援系統。"],
        "content": [
            ("Health", "健康概念、疾病、生活方式、公共衛生和健康推廣。"),
            ("Social care", "社會需要、弱勢群體、照顧模式、倫理和政策。"),
            ("Community services", "本地服務系統、跨專業協作、社區資源和服務評估。"),
        ],
    },
    "information-communication-technology": {
        "aims": ["高中 ICT 建立數據、編程、系統、網絡、應用和社會影響的理解。"],
        "content": [
            ("Data and information", "數據表示、資料庫、資訊處理、數據分析和私隱。"),
            ("Programming", "演算法、程序設計、問題分解、測試和除錯。"),
            ("Networks and systems", "電腦系統、網絡、互聯網、保安和雲端/應用概念。"),
            ("Social implications", "資訊倫理、知識產權、數碼足跡、科技對社會的影響。"),
        ],
    },
    "technology-and-living": {
        "aims": ["高中科技與生活從家庭、食物、服裝、資源管理和生活科技培養實務和決策能力。"],
        "content": [
            ("Food science", "營養、食物安全、烹調、食物科學和健康選擇。"),
            ("Fashion and textiles", "纖維、服裝設計、製作、消費和可持續時尚。"),
            ("Family living", "家庭資源、生活管理、消費決策和生活質素。"),
        ],
    },
    "chinese-history": {
        "aims": ["通過中國歷史時序、史料、重要事件、文化承傳和國家發展建立歷史意識與國民身份。"],
        "content": [
            ("Chronology", "按朝代、時期和主題理解中國歷史發展脈絡。"),
            ("Historical sources", "閱讀史料、圖像、地圖和不同敘述，辨析證據與觀點。"),
            ("Culture", "制度、思想、科技、文化交流、人物和中華文化承傳。"),
            ("National development", "近現代中國、改革開放、香港與國家關係和世界互動。"),
        ],
    },
    "citizenship-economics-society": {
        "aims": ["初中 CES 覆蓋 PSHE 的個人與社會發展、資源與經濟活動、社會制度與公民，三年 12 個 module。"],
        "content": [
            ("Citizenship", "權利與責任、法治、憲法與基本法、香港特區、國家和全球議題。"),
            ("Economics", "資源、選擇、香港經濟、個人理財、消費、勞動和可持續發展。"),
            ("Society", "自我認識、家庭、人際、社會參與、媒體資訊和價值判斷。"),
            ("Module sequence", "EDB 建議每年教授 4 個 module，三年合共約 100 小時。"),
        ],
    },
    "geography": {
        "aims": ["地理建立地方與空間、人地互動、地理探究、可持續發展和數據/地圖技能。"],
        "content": [
            ("Place and space", "位置、分佈、區域差異、城市、國家和全球尺度。"),
            ("Human-environment interaction", "自然環境、人口、資源、災害、發展和環境管理。"),
            ("Data skills", "地圖、圖表、GIS/空間資料、實地考察和資料詮釋。"),
            ("Sustainability", "可持續城市、氣候、資源管理和全球互依。"),
        ],
    },
    "history": {
        "aims": ["歷史科培養時間觀念、證據運用、因果分析、延續與變遷、多角度理解和歷史同理心。"],
        "content": [
            ("Historical enquiry", "提出問題、蒐集證據、建立解釋和作出判斷。"),
            ("Sources", "運用文字、圖像、地圖、口述和實物資料。"),
            ("Change and continuity", "理解不同時期社會、政治、經濟和文化變化。"),
            ("Perspectives", "比較不同人士、群體和地方的觀點。"),
        ],
    },
    "religious-education": {
        "aims": ["初中宗教教育支援信仰理解、價值反思、倫理判斷和尊重多元。"],
        "content": [
            ("Beliefs", "主要宗教信念、故事、禮儀和社群生活。"),
            ("Values", "生命、家庭、關愛、公義、和平和責任。"),
            ("Ethics", "以宗教/人文角度討論日常倫理議題。"),
        ],
    },
    "economics": {
        "aims": ["高中經濟建立稀缺、選擇、成本、需求供應、市場、宏觀經濟和政策分析能力。"],
        "content": [
            ("Scarcity and choice", "機會成本、分工、交換、效率和經濟制度。"),
            ("Markets", "需求、供應、價格、競爭、市場失靈和政府角色。"),
            ("Macroeconomy", "國民收入、通脹、失業、貨幣、銀行、公共財政和國際貿易。"),
            ("Policy", "以數據和概念分析公共政策、企業和個人選擇。"),
        ],
    },
    "ethics-and-religious-studies": {
        "aims": ["高中倫理與宗教培養宗教知識、倫理推理、價值澄清和有根據的論證。"],
        "content": [
            ("Ethics", "倫理理論、生命倫理、社會倫理、個人與群體責任。"),
            ("Religion", "宗教傳統、信念、實踐、文化和現代社會議題。"),
            ("Argumentation", "以概念、例子和反駁建立有結構的倫理論述。"),
        ],
    },
    "tourism-and-hospitality-studies": {
        "aims": ["高中旅遊與款待建立旅遊業、款待服務、目的地管理和顧客服務理解。"],
        "content": [
            ("Tourism industry", "旅遊系統、趨勢、影響、可持續旅遊和市場。"),
            ("Hospitality", "酒店、餐飲、服務流程、品質和人力資源。"),
            ("Destination management", "景點、文化、活動、運輸和目的地規劃。"),
            ("Customer service", "顧客需要、溝通、服務補救和專業態度。"),
        ],
    },
    "citizenship-social-development": {
        "aims": ["高中公民與社會發展以香港、國家和當代世界三個 theme 建立知識基礎、國民身份和全球視野。"],
        "content": [
            ("Hong Kong under One Country, Two Systems", "憲法、基本法、香港特區制度、法治、權利義務和香港社會文化。"),
            ("Our Country since Reform and Opening-up", "國家改革開放、現代化、人民生活、綜合國力、文化和發展策略。"),
            ("Interconnectedness and Interdependence", "全球化、公共衛生、科技、環境、可持續發展和國際合作。"),
            ("Mainland study tours", "透過內地考察連結課堂學習、觀察、記錄、專題和反思。"),
        ],
    },
    "music": {
        "aims": ["音樂科透過演奏、創作、聆聽和音樂情境培養音樂能力、審美和文化理解。"],
        "content": [
            ("Performing", "歌唱、樂器、合奏、節奏、音準和表演技巧。"),
            ("Creating", "旋律、節奏、聲響、編曲、即興和作品修訂。"),
            ("Listening", "聆賞、描述、分析音樂元素、風格和情感。"),
            ("Music in context", "中外音樂文化、國歌學習、音樂與生活/社會。"),
        ],
    },
    "visual-arts": {
        "aims": ["視覺藝術透過創作、欣賞、視覺文化和藝術情境培養表達、審美和批判理解。"],
        "content": [
            ("Creating", "媒介、技巧、構圖、色彩、造型、主題發展和作品修訂。"),
            ("Appreciating", "描述、分析、詮釋和評價藝術作品。"),
            ("Visual culture", "圖像、媒體、設計、建築、流行文化和身份。"),
            ("Arts in context", "本地、中華和世界藝術文化及社會語境。"),
        ],
    },
    "physical-education": {
        "aims": ["體育科透過活動和反思發展運動技能、健康體適能、知識、安全和正面價值觀。"],
        "content": [
            ("Motor skills", "移動、平衡、操控、協調和專項運動技能。"),
            ("Health and fitness", "體適能、健康生活、運動安全和自我管理。"),
            ("Sports knowledge", "規則、策略、觀察、評估和活動設計。"),
            ("Values and attitudes", "合作、公平、堅毅、尊重和責任。"),
        ],
    },
    "applied-learning": {
        "aims": ["應用學習讓高中學生在真實專業情境中發展應用知識、技能、價值觀和生涯探索。"],
        "content": [
            ("Creative Studies", "設計、藝術、媒體、創作流程和作品展示。"),
            ("Media and Communication", "傳意、製作、數碼媒體、受眾和內容倫理。"),
            ("Business, Management and Law", "商業、管理、法律、服務和職場情境。"),
            ("Services", "服務行業、顧客需要、流程和專業態度。"),
            ("Applied Science", "科學應用、健康、環境、檢測或實驗情境。"),
            ("Engineering and Production", "工程、製造、系統、測試和安全。"),
        ],
    },
    "other-languages": {
        "aims": ["其他語言拓展學生跨文化溝通、語言基礎和國際視野。"],
        "content": [
            ("French / German / Hindi / Japanese / Korean / Spanish / Urdu", "按學校提供語言選擇發展聽說讀寫和文化理解。"),
            ("Communication", "日常情境、語音文字、詞彙、語法和互動任務。"),
            ("Culture", "社會文化、禮儀、媒體文本和跨文化比較。"),
        ],
    },
}

GRADE_EMPHASIS = {
    "K1": ["以適應學校生活、基本自理、感官探索、遊戲語言和安全感建立為主。"],
    "K2": ["擴展同伴互動、簡單規則、主題探索、敘述經驗和創作表達。"],
    "K3": ["加強自理、自信、早期讀寫/數學準備、專注力和小一銜接。"],
    "P1": ["2025/26 起 P1 同步推行小學科學和小學人文；app 需支援新科目和常識過渡。"],
    "P2": ["P2 仍處於常識科過渡級別，應保留常識科 evidence，同時準備映射到小學科學/小學人文。"],
    "P3": ["P3 應鞏固低小語文、數學和常識基礎，為 P4 新科目/高小學習作銜接。"],
    "P4": ["2025/26 起 P4 同步推行小學科學和小學人文；高小編程/STEAM evidence 應獨立標記。"],
    "P5": ["P5 仍處於常識科過渡級別，應支援高小專題、資料處理、編程和跨學科 evidence。"],
    "P6": ["P6 仍處於常識科過渡級別，重點是小學總結、小六升中、初中 KLA 連接和 portfolio 梳理。"],
    "S1": ["S1 起公民、經濟與社會在 2024/25 推行；中史為獨立必修，科技教育含 AI/ICT 基礎。"],
    "S2": ["S2 應延續初中 KLA 基礎，逐步深化學科方法、資料判讀、實驗/探究和專題能力。"],
    "S3": ["S3 是高中選科銜接年，app 應突出能力證據、興趣、選科關聯和高中科目 readiness。"],
    "S4": ["S4 進入高中核心/選修/應用學習架構；要標明 subject C&A guide、考評方向和 OLE evidence。"],
    "S5": ["S5 加深高中學科內容和 assessment evidence，追蹤概念弱點、校本評估/專題和考試準備。"],
    "S6": ["S6 以公開試、portfolio 總結、升學/生涯證據和學習成果整理為主。"],
}

MATHEMATICS_GRADE_CONTENT = {
    "P1": ["數字至 20、基礎加減、0 的概念、簡單長度/距離、常見平面和立體圖形、方向與簡單圖表。"],
    "P2": ["數字擴展、加減策略、乘法/除法概念、金錢和時間、簡單量度、圖形和統計圖。"],
    "P3": ["四則運算、簡單分數、重量/容量、角、平行/垂直、四邊形和簡單數據詮釋。"],
    "P4": ["大數、倍數與因數、小數/分數連結、周界/面積、角度量度、方向和坐標/位置基礎。"],
    "P5": ["分數、小數、百分數、體積、圓、平均數、圖表選擇和較複雜文字題。"],
    "P6": ["數與代數綜合、速度與時間、量度準確度、體積/容量、統計圖判讀和解題策略。"],
    "S1": ["數與代數、比率、百分率、基礎幾何、量度、坐標、統計和初中證明/推理入門。"],
    "S2": ["代數式、方程、率與比例、幾何性質、面積/體積、數據處理和概率基礎。"],
    "S3": ["多項式、函數前備、坐標幾何、三角/圓基礎、統計和高中數學銜接。"],
    "S4": ["高中必修部分：數與代數、函數、變分、幾何、三角、統計及可選延伸模組基礎。"],
    "S5": ["高中必修和延伸內容深化，包括函數、指數/對數、幾何、三角、統計和應用題。"],
    "S6": ["整合高中數學內容、解題策略、證明、數據分析和公開試要求。"],
}


def slugify(value: str) -> str:
    value = value.lower().replace("&", "and")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def source_lookup() -> dict[str, dict[str, str]]:
    return {source["id"]: source for source in CURRICULUM_SOURCES}


def stage_lookup() -> dict[str, dict[str, str]]:
    return {stage["id"]: stage for stage in CURRICULUM_STAGES}


def node_id(grade: str, subject: dict[str, Any], strand: str) -> str:
    return f"hk-{grade.lower()}-{subject['id']}-{slugify(strand)}"


def bullet_list(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def table_rows(rows: list[tuple[str, str]], evidence: str) -> str:
    return "\n".join(f"| {label} | {detail} | {evidence} |" for label, detail in rows)


def subject_content(subject: dict[str, Any]) -> dict[str, Any]:
    base = KLA_EDB_CONTENT.get(subject["kla_id"], KLA_EDB_CONTENT["cross-curricular"])
    detail = SUBJECT_EDB_CONTENT.get(subject["id"], {})
    aims = [*base["aims"], *detail.get("aims", [])]
    content = detail.get("content", base["content"])
    evidence = [*base["evidence"], *detail.get("evidence", [])]
    return {
        "aims": aims,
        "content": content,
        "evidence": evidence,
    }


def grade_content_notes(grade: str, subject: dict[str, Any]) -> list[str]:
    notes = [*GRADE_EMPHASIS.get(grade, [])]
    if subject["id"] == "mathematics" and grade in MATHEMATICS_GRADE_CONTENT:
        notes.extend(MATHEMATICS_GRADE_CONTENT[grade])
    if subject["id"] == "primary-science":
        notes.append("小學科學文件列明四個 strand 和 15 個 theme；P1/P4 是 2025/26 的首批推行級別。")
    if subject["id"] == "primary-humanities":
        notes.append("小學人文在 P1/P4 先行，應把常識科的人文/社會內容逐步重整為獨立人文 evidence。")
    if subject["id"] == "general-studies":
        notes.append("常識科為過渡科目；到 2027/28 將由小學科學和小學人文完全取代。")
    if subject["id"] == "citizenship-economics-society":
        notes.append("CES curriculum guide 建議三年 12 個 module，每學年 4 個 module，總課時約 100 小時。")
    if subject["id"] == "citizenship-social-development":
        notes.append("CSD 三個 theme 之外包含內地考察；portfolio 應保存考察前準備、觀察紀錄、反思和專題成果。")
    if subject["id"] == "applied-learning":
        notes.append("學生一般最多可把兩個 ApL 課程作選修科；NCS 學生在指定情況下可另修 ApL Chinese。")
    if subject["id"] == "other-languages":
        notes.append("2025/26 S4 提供 7 個其他語言選擇；S5/S6 提供 6 個選擇，依 EDB 2025/26 科目表為準。")
    return notes


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def subject_doc(grade: str, subject: dict[str, Any], sources: dict[str, dict[str, str]]) -> str:
    content = subject_content(subject)
    stage_content = STAGE_EDB_CONTENT[GRADE_STAGE[grade]]
    grade_notes = grade_content_notes(grade, subject)
    source_rows = "\n".join(
        f"| `{source_id}` | [{sources[source_id]['title']}]({sources[source_id]['url']}) | {sources[source_id]['note']} |"
        for source_id in subject["source_ids"]
        if source_id in sources
    )
    strand_rows = "\n".join(
        f"| `{node_id(grade, subject, strand)}` | {strand} | App-level curriculum node seed; validate against EDB subject guide before high-stakes use. | Parent confirmation required |"
        for strand in subject["strands"]
    )
    status = subject.get("status", "No special transition note.")
    strand_evidence = "Use as OCR/portfolio/mastery tags after parent or teacher confirmation."
    return f"""# {grade} {subject['display_name_zh']} / {subject['name']}

> EduPass AI internal syllabus reference derived from EDB curriculum documents. This file is a structured paraphrase for product mapping, not an official EDB publication. Keep the official links for audit and use short references only; do not paste whole EDB PDFs verbatim.

## Official Alignment

| Field | Value |
| --- | --- |
| Grade | {grade} |
| Subject | {subject['name']} |
| Chinese label | {subject['display_name_zh']} |
| KLA / area | {subject['kla_name']} |
| Catalogue subject id | `{subject['id']}` |
| Full grade coverage in catalogue | {', '.join(subject['grades'])} |
| Status / transition | {status} |

## EDB-Derived Curriculum Content

**Stage context:** {stage_content['source']}

{bullet_list(stage_content['learning_focus'])}

**Subject aims / learning targets**

{bullet_list(content['aims'])}

**Learning content to preserve in EduPass AI**

| Strand / area | EDB-derived content summary | EduPass AI evidence mapping |
| --- | --- | --- |
{table_rows(content['content'], strand_evidence)}

**Grade/year emphasis**

{bullet_list(grade_notes)}

## Syllabus Focus For App Mapping

| Curriculum node seed | Strand / focus | Detail level | Confirmation |
| --- | --- | --- | --- |
{strand_rows}

## EduPass AI Usage

- OCR review: map uploaded homework / worksheet evidence to `{subject['id']}` only after parent confirmation.
- Weakness tracking: store mastery under KLA `{subject['kla_id']}` and subject `{subject['name']}`.
- Practice generation: use original questions aligned to the strand; never copy uploaded worksheets.
- Portfolio: tag achievements and artefacts with grade `{grade}`, KLA and source IDs below.

## Assessment / Learning Evidence To Preserve

{bullet_list(content['evidence'])}

## Official Sources

| Source ID | Source | Note |
| --- | --- | --- |
{source_rows}

## Maintenance Notes

- Add more fine-grained EDB chapter / section references when implementing a high-stakes recommendation engine.
- Keep the syllabus content as paraphrased structured notes, not long verbatim extracts from EDB PDFs.
- Add bilingual topic aliases for OCR and search as real school worksheets are tested.
"""


def grade_index(grade: str, subjects: list[dict[str, Any]], stages: dict[str, dict[str, str]]) -> str:
    stage = stages[GRADE_STAGE[grade]]
    stage_content = STAGE_EDB_CONTENT[GRADE_STAGE[grade]]
    rows = "\n".join(
        f"| [{subject['display_name_zh']} / {subject['name']}]({slugify(subject['id'])}.md) | {subject['kla_name']} | {', '.join(subject['strands'][:3])} |"
        for subject in subjects
    )
    return f"""# {grade} Syllabus Index

Stage: **{stage['label']} / {stage['caption']}**

{stage['learning_goal']}

## EDB Stage Content Snapshot

Source basis: {stage_content['source']}

{bullet_list(stage_content['learning_focus'])}

| Subject | KLA / area | App-level strand seeds |
| --- | --- | --- |
{rows}
"""


def root_index() -> str:
    grade_links = "\n".join(f"- [{grade}](./{grade}/README.md)" for grade in GRADE_ORDER)
    return f"""# Distributed HKEDB K1-S6 Syllabus Notes

Generated from `backend/app/curriculum_catalog.py` and EDB-derived structured content inside `scripts/generate_syllabus_docs.py`.

This folder is intentionally split by **grade/year** and **subject** so future agents can update one syllabus file without touching the whole catalogue.

Each subject file contains:

- official alignment and source IDs
- EDB-derived curriculum aims / learning targets
- learning content summaries by strand or subject area
- grade/year emphasis
- EduPass AI evidence mapping and maintenance notes

## Grade Index

{grade_links}

## Maintenance Rules

- Keep official EDB URLs in each subject file.
- Add detailed topic / objective rows under each file's `Syllabus Focus For App Mapping` section.
- Preserve EDB syllabus meaning through structured summaries; do not paste full EDB PDFs or long copyrighted passages.
- Any AI-generated mapping must remain parent-confirmed before it affects the child's learning profile.
"""


def main() -> None:
    out_dir = ROOT / "docs" / "syllabus"
    sources = source_lookup()
    stages = stage_lookup()
    write(out_dir / "README.md", root_index())

    for grade in GRADE_ORDER:
        subjects = subjects_for_grade(grade)
        grade_dir = out_dir / grade
        write(grade_dir / "README.md", grade_index(grade, subjects, stages))
        for subject in subjects:
            write(grade_dir / f"{slugify(subject['id'])}.md", subject_doc(grade, subject, sources))

    print(f"Wrote syllabus docs for {len(GRADE_ORDER)} grades to {out_dir}")


if __name__ == "__main__":
    main()
