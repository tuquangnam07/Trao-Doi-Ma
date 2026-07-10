// Danh sách 10 thẻ
const CARDS = [
    { id: 1, name: 'Eland\'orr Mộng giới thần chủ', character: 'Eland\'orr' },
    { id: 2, name: 'Aya Công chúa Cầu Vồng', character: 'Aya' },
    { id: 3, name: 'Valhein Thứ nguyên vệ thần', character: 'Valhein' },
    { id: 4, name: 'Liliana - Ma Pháp Tối Thượng', character: 'Liliana' },
    { id: 5, name: 'Điêu Thuyền - Nhật Nguyệt Thánh Linh', character: 'Điêu Thuyền' },
    { id: 6, name: 'Capheny Càn Nguyên Điện Chủ', character: 'Capheny' },
    { id: 7, name: 'Tulen - Chí Tôn Kiếm Tiên', character: 'Tulen' },
    { id: 8, name: 'Airi - Bích Hải Thánh Nữ', character: 'Airi' },
    { id: 9, name: 'Tel\'Annas Tân niên vệ thần', character: 'Tel\'Annas' },
    { id: 10, name: 'Thẻ bí ẩn (Mystery Card)', character: 'Ẩn' }
];

// Các từ khóa tìm kiếm cho mỗi thẻ (để matching)
const CARD_KEYWORDS = {
    1: ['elandorr', 'mộng giới', 'thần chủ'],
    2: ['aya', 'công chúa', 'cầu vồng'],
    3: ['valhein', 'thứ nguyên', 'vệ thần'],
    4: ['liliana', 'ma pháp', 'tối thượng'],
    5: ['điêu thuyền', 'nhật nguyệt', 'thánh linh'],
    6: ['capheny', 'càn nguyên', 'điện chủ'],
    7: ['tulen', 'chí tôn', 'kiếm tiên'],
    8: ['airi', 'bích hải', 'thánh nữ'],
    9: ['telannas', 'tân niên', 'vệ thần'],
    10: ['bí ẩn', 'mystery']
};

// Collection reference
const exchangesRef = db.collection('exchanges');

// State
let currentFilter = { have: '', need: '' };
let allExchanges = [];

// DOM Elements
const haveSelect = document.getElementById('haveCard');
const needSelect = document.getElementById('needCard');
const filterHave = document.getElementById('filterHave');
const filterNeed = document.getElementById('filterNeed');
const exchangeCode = document.getElementById('exchangeCode');
const exchangeList = document.getElementById('exchangeList');
const countBadge = document.getElementById('countBadge');
const loadingSpinner = document.getElementById('loadingSpinner');
const textInput = document.getElementById('textInput');

// Initialize selects
function populateSelects() {
    const selects = [haveSelect, needSelect, filterHave, filterNeed];
    
    selects.forEach(select => {
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        CARDS.forEach(card => {
            const option = document.createElement('option');
            option.value = card.id;
            option.textContent = `${card.name}`;
            select.appendChild(option);
        });
    });
}

// ====== HÀM TRÍCH XUẤT TỰ ĐỘNG ======

// Tìm mã trong văn bản
function extractCode(text) {
    // Tìm mã định dạng: --XXXXX--
    let codeMatch = text.match(/--([A-Za-z0-9]+)--/);
    if (codeMatch) return codeMatch[0];
    
    // // Tìm mã định dạng: [[XXXXX]]
    // codeMatch = text.match(/\[\[([^\]]+)\]\]/);
    // if (codeMatch) return codeMatch[1];
    
    // // Tìm mã định dạng: {XXXXX}
    // codeMatch = text.match(/\{([^}]+)\}/);
    // if (codeMatch) return codeMatch[1];
    
    // Tìm bất kỳ chuỗi ký tự đặc biệt nào dài 8-15 ký tự
    codeMatch = text.match(/[A-Za-z0-9]{8,15}/);
    if (codeMatch) return codeMatch[0];
    
    return null;
}

// Tìm thẻ trong văn bản
function findCardInText(text, cardId) {
    const keywords = CARD_KEYWORDS[cardId] || [];
    const normalizedText = text.toLowerCase();
    
    // Kiểm tra từng từ khóa
    for (const keyword of keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
            return true;
        }
    }
    
    // Kiểm tra tên thẻ
    const card = CARDS.find(c => c.id === cardId);
    if (card) {
        if (normalizedText.includes(card.name.toLowerCase())) {
            return true;
        }
        if (normalizedText.includes(card.character.toLowerCase())) {
            return true;
        }
    }
    
    return false;
}

// Trích xuất thông tin từ văn bản
function extractFromText() {
    const text = textInput.value.trim();
    
    if (!text) {
        showToast('Vui lòng nhập văn bản để trích xuất!', 'error');
        textInput.classList.add('extract-error');
        setTimeout(() => textInput.classList.remove('extract-error'), 2000);
        return;
    }
    
    // 1. Trích xuất mã
    const code = extractCode(text);
    if (code) {
        exchangeCode.value = code;
        showToast(`✅ Đã tìm thấy mã: ${code}`, 'success');
    } else {
        showToast('⚠️ Không tìm thấy mã trong văn bản. Vui lòng nhập thủ công.', 'warning');
    }
    
    // 2. Tìm thẻ "đổi đi" (thẻ có) và thẻ "cần" (thẻ nhận)
    // Phân tích cấu trúc câu: "đổi A lấy B" hoặc "đổi A với B" hoặc "A lấy B"
    let haveCardId = null;
    let needCardId = null;
    
    // Pattern 1: "đổi X lấy Y" hoặc "đổi X với Y"
    const exchangePatterns = [
        /đổi\s+([^,。.!?]+?)\s+(lấy|với)\s+([^,。.!?]+?)(?:\s|$|\.|,|!|\?)/i,
        /muốn\s+đổi\s+([^,。.!?]+?)\s+(lấy|với)\s+([^,。.!?]+?)(?:\s|$|\.|,|!|\?)/i,
        /([^,。.!?]+?)\s+(lấy|với)\s+([^,。.!?]+?)(?:\s|$|\.|,|!|\?)/i
    ];
    
    let haveText = '';
    let needText = '';
    
    for (const pattern of exchangePatterns) {
        const match = text.match(pattern);
        if (match) {
            haveText = match[1].trim();
            needText = match[3].trim();
            break;
        }
    }
    
    // Nếu không tìm thấy pattern, thử tìm từ "lấy"
    if (!haveText && !needText) {
        const parts = text.split(/lấy|với/i);
        if (parts.length >= 2) {
            // Lấy phần trước và sau từ "lấy"
            const before = parts[0].trim();
            const after = parts[1].trim();
            
            // Tìm tên thẻ trong phần trước và sau
            for (const card of CARDS) {
                if (before.includes(card.name) || before.includes(card.character)) {
                    haveText = before;
                }
                if (after.includes(card.name) || after.includes(card.character)) {
                    needText = after;
                }
            }
        }
    }
    
    // Tìm thẻ dựa trên text đã trích xuất
    if (haveText || needText) {
        // Tìm thẻ "có" (đổi đi)
        for (const card of CARDS) {
            if (haveText && (haveText.includes(card.name) || haveText.includes(card.character))) {
                haveCardId = card.id;
                break;
            }
        }
        
        // Tìm thẻ "cần" (nhận về)
        for (const card of CARDS) {
            if (needText && (needText.includes(card.name) || needText.includes(card.character))) {
                needCardId = card.id;
                break;
            }
        }
    }
    
    // Fallback: nếu không tìm thấy qua pattern, thử tìm trực tiếp trong text
    if (!haveCardId || !needCardId) {
        // Tìm thẻ "có" - thường là thẻ đầu tiên được nhắc đến
        let foundCards = [];
        for (const card of CARDS) {
            if (text.includes(card.name) || text.includes(card.character)) {
                foundCards.push(card.id);
            }
        }
        
        if (foundCards.length >= 2) {
            haveCardId = foundCards[0];
            needCardId = foundCards[1];
        } else if (foundCards.length === 1) {
            // Nếu chỉ tìm thấy 1 thẻ, giữ nguyên
            if (!haveCardId) haveCardId = foundCards[0];
            if (!needCardId) needCardId = foundCards[0];
        }
    }
    
    // Cập nhật UI
    if (haveCardId) {
        haveSelect.value = haveCardId;
        showToast(`📤 Tìm thấy thẻ có: ${CARDS.find(c => c.id === haveCardId).name}`, 'success');
    } else {
        showToast('⚠️ Không tìm thấy thẻ "có" (muốn đổi đi). Vui lòng chọn thủ công.', 'warning');
    }
    
    if (needCardId) {
        needSelect.value = needCardId;
        showToast(`📥 Tìm thấy thẻ cần: ${CARDS.find(c => c.id === needCardId).name}`, 'success');
    } else {
        showToast('⚠️ Không tìm thấy thẻ "cần" (muốn nhận về). Vui lòng chọn thủ công.', 'warning');
    }
    
    // Highlight success
    if (code && haveCardId && needCardId) {
        textInput.classList.add('extract-success');
        setTimeout(() => textInput.classList.remove('extract-success'), 2000);
    } else {
        textInput.classList.add('extract-error');
        setTimeout(() => textInput.classList.remove('extract-error'), 2000);
    }
}

// Clear text input
function clearTextInput() {
    textInput.value = '';
    textInput.classList.remove('extract-success', 'extract-error');
}

// ====== CÁC HÀM HIỆN CÓ ======

// Show toast notification
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Copy to clipboard
function copyCode(code, element) {
    navigator.clipboard.writeText(code).then(() => {
        const originalText = element.textContent;
        element.textContent = '✅ Đã copy';
        setTimeout(() => {
            element.textContent = originalText;
        }, 2000);
        showToast('Đã sao chép mã!', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        showToast('Đã sao chép mã!', 'success');
    });
}

// Format time
function formatTime(timestamp) {
    if (!timestamp) return 'Vừa xong';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
}

// Render exchanges
function renderExchanges(exchanges) {
    if (!exchanges || exchanges.length === 0) {
        exchangeList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <p>Chưa có mã trao đổi nào phù hợp</p>
                <p style="font-size: 14px; margin-top: 8px;">Hãy đăng tải mã của bạn để mọi người cùng trao đổi!</p>
            </div>
        `;
        countBadge.textContent = '0 mã';
        return;
    }
    
    const sorted = [...exchanges].sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return timeB - timeA;
    });
    
    let html = '';
    sorted.forEach(item => {
        const haveCard = CARDS.find(c => c.id === item.haveCardId);
        const needCard = CARDS.find(c => c.id === item.needCardId);
        
        html += `
            <div class="exchange-card">
                <div class="card-info">
                    <span class="card-badge have">📤 ${haveCard ? haveCard.name : 'Không rõ'}</span>
                    <span class="card-arrow">➜</span>
                    <span class="card-badge need">📥 ${needCard ? needCard.name : 'Không rõ'}</span>
                    <span class="card-code">${item.code}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span class="card-time">⏱️ ${formatTime(item.createdAt)}</span>
                    <button class="copy-btn" onclick="copyCode('${item.code}', this)">📋 Copy mã</button>
                </div>
            </div>
        `;
    });
    
    exchangeList.innerHTML = html;
    countBadge.textContent = `${sorted.length} mã`;
}

// Load exchanges
function loadExchanges(haveCardId = '', needCardId = '') {
    loadingSpinner.style.display = 'block';
    exchangeList.innerHTML = '';
    
    let query = exchangesRef.orderBy('createdAt', 'desc');
    
    if (haveCardId && needCardId) {
        query = exchangesRef
            .where('haveCardId', '==', parseInt(haveCardId))
            .where('needCardId', '==', parseInt(needCardId));
    } else if (haveCardId) {
        query = exchangesRef.where('haveCardId', '==', parseInt(haveCardId));
    } else if (needCardId) {
        query = exchangesRef.where('needCardId', '==', parseInt(needCardId));
    }
    
    query.get().then(snapshot => {
        loadingSpinner.style.display = 'none';
        
        const exchanges = [];
        snapshot.forEach(doc => {
            exchanges.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        allExchanges = exchanges;
        renderExchanges(exchanges);
    }).catch(error => {
        loadingSpinner.style.display = 'none';
        console.error('Error loading exchanges:', error);
        
        if (error.code === 'permission-denied') {
            showToast('⚠️ Lỗi bảo mật: Vui lòng cập nhật Firebase Rules', 'error');
            exchangeList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🔒</span>
                    <p>Không thể kết nối đến cơ sở dữ liệu</p>
                    <p style="font-size: 14px; margin-top: 8px; color: #C62828;">
                        Lỗi: Missing or insufficient permissions
                    </p>
                    <p style="font-size: 13px; margin-top: 12px; background: #FFF3E0; padding: 12px; border-radius: 8px;">
                        💡 Hướng dẫn sửa lỗi:<br>
                        1. Vào Firebase Console → Firestore → Rules<br>
                        2. Thay rules bằng: allow read, write: if true;<br>
                        3. Nhấn Publish
                    </p>
                </div>
            `;
            return;
        }
        
        // Fallback
        exchangesRef.orderBy('createdAt', 'desc').get().then(snapshot => {
            const all = [];
            snapshot.forEach(doc => {
                all.push({ id: doc.id, ...doc.data() });
            });
            
            let filtered = all;
            if (haveCardId) {
                filtered = filtered.filter(item => item.haveCardId === parseInt(haveCardId));
            }
            if (needCardId) {
                filtered = filtered.filter(item => item.needCardId === parseInt(needCardId));
            }
            
            allExchanges = filtered;
            renderExchanges(filtered);
        }).catch(() => {
            showToast('Không thể tải dữ liệu. Vui lòng thử lại sau.', 'error');
        });
    });
}

// Post exchange
function postExchange() {
    const haveCardId = parseInt(haveSelect.value);
    const needCardId = parseInt(needSelect.value);
    const code = exchangeCode.value.trim();
    
    if (!haveCardId || !needCardId) {
        showToast('Vui lòng chọn cả 2 loại thẻ!', 'error');
        return;
    }
    
    if (haveCardId === needCardId) {
        showToast('Không thể đổi thẻ giống nhau!', 'error');
        return;
    }
    
    if (!code) {
        showToast('Vui lòng nhập mã trao đổi từ game!', 'error');
        return;
    }
    
    if (code.length < 5) {
        showToast('Mã quá ngắn. Vui lòng nhập đúng mã từ game!', 'error');
        return;
    }
    
    // Check duplicate
    exchangesRef.where('code', '==', code).get().then(snapshot => {
        if (!snapshot.empty) {
            showToast('Mã này đã được đăng tải!', 'error');
            return;
        }
        
        const data = {
            haveCardId: haveCardId,
            needCardId: needCardId,
            code: code,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        exchangesRef.add(data).then(() => {
            showToast('✅ Đăng tải mã thành công!', 'success');
            exchangeCode.value = '';
            haveSelect.value = '';
            needSelect.value = '';
            textInput.value = '';
            textInput.classList.remove('extract-success', 'extract-error');
            loadExchanges(currentFilter.have, currentFilter.need);
        }).catch(error => {
            showToast('Lỗi: ' + error.message, 'error');
        });
    }).catch(() => {
        const data = {
            haveCardId: haveCardId,
            needCardId: needCardId,
            code: code,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        exchangesRef.add(data).then(() => {
            showToast('✅ Đăng tải mã thành công!', 'success');
            exchangeCode.value = '';
            haveSelect.value = '';
            needSelect.value = '';
            textInput.value = '';
            textInput.classList.remove('extract-success', 'extract-error');
            loadExchanges(currentFilter.have, currentFilter.need);
        }).catch(error => {
            showToast('Lỗi: ' + error.message, 'error');
        });
    });
}

// Apply filter
function applyFilter() {
    const have = filterHave.value;
    const need = filterNeed.value;
    currentFilter = { have, need };
    loadExchanges(have, need);
}

// Reset filter
function resetFilter() {
    filterHave.value = '';
    filterNeed.value = '';
    currentFilter = { have: '', need: '' };
    loadExchanges('', '');
}

// Realtime listener
function setupRealtimeListener() {
    let query = exchangesRef.orderBy('createdAt', 'desc').limit(120);
    
    query.onSnapshot(snapshot => {
        if (!currentFilter.have && !currentFilter.need) {
            const exchanges = [];
            snapshot.forEach(doc => {
                exchanges.push({ id: doc.id, ...doc.data() });
            });
            allExchanges = exchanges;
            renderExchanges(exchanges);
        }
    }, error => {
        console.warn('Realtime listener error:', error);
    });
}

// Initialize
function init() {
    populateSelects();
    loadExchanges('', '');
    setupRealtimeListener();
    
    exchangeCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            postExchange();
        }
    });
    
    // Auto extract on paste
    textInput.addEventListener('paste', function(e) {
        setTimeout(() => {
            if (this.value.trim()) {
                extractFromText();
            }
        }, 100);
    });
}

// Run when DOM ready
document.addEventListener('DOMContentLoaded', init);
