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

// Các từ khóa tìm kiếm cho mỗi thẻ
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
let currentFilter = { have: '', need: '', time: 'all', status: 'all' };
let allExchanges = [];
let unreadCount = 0;
let lastNotificationTime = null;
let notificationEnabled = true;
let currentPage = 1;
const pageSize = 20;
let totalExchanges = 0;

// DOM Elements
const haveSelect = document.getElementById('haveCard');
const needSelect = document.getElementById('needCard');
const filterHave = document.getElementById('filterHave');
const filterNeed = document.getElementById('filterNeed');
const filterTime = document.getElementById('filterTime');
const filterStatus = document.getElementById('filterStatus');
const exchangeCode = document.getElementById('exchangeCode');
const exchangeList = document.getElementById('exchangeList');
const countBadge = document.getElementById('countBadge');
const successRate = document.getElementById('successRate');
const loadingSpinner = document.getElementById('loadingSpinner');
const textInput = document.getElementById('textInput');
const notificationBadge = document.getElementById('notificationBadge');
const notificationPopup = document.getElementById('notificationPopup');
const notificationMessage = document.getElementById('notificationMessage');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const pageInfo = document.getElementById('pageInfo');

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

// ====== DARK MODE ======
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const toggle = document.getElementById('themeToggle');
    if (document.body.classList.contains('dark-mode')) {
        toggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        toggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

// Load theme from localStorage
function loadTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').textContent = '☀️';
    }
}

// ====== TRÍCH XUẤT TỰ ĐỘNG (SỬA LỖI NHẬN DIỆN MÃ) ======
function extractCode(text) {
    // Ưu tiên tìm mã trong dấu -- hoặc [[
    let codeMatch = text.match(/--([A-Za-z0-9_\-@#$%^&*]+)--/);
    if (codeMatch) {
        console.log('Found code with --:', codeMatch[1]);
        return codeMatch[1];
    }
    
    codeMatch = text.match(/\[\[([A-Za-z0-9_\-@#$%^&*]+)\]\]/);
    if (codeMatch) {
        console.log('Found code with [[]]:', codeMatch[1]);
        return codeMatch[1];
    }
    
    codeMatch = text.match(/\{([A-Za-z0-9_\-@#$%^&*]+)\}/);
    if (codeMatch) {
        console.log('Found code with {}:', codeMatch[1]);
        return codeMatch[1];
    }
    
    codeMatch = text.match(/\*([A-Za-z0-9_\-@#$%^&*]+)\*/);
    if (codeMatch) {
        console.log('Found code with *:', codeMatch[1]);
        return codeMatch[1];
    }
    
    // Tìm từ khóa "Mã đổi:" hoặc "mã:" theo sau là code
    const codeKeywordMatch = text.match(/(?:Mã đổi|mã|Mã)[\s:]+([A-Za-z0-9_\-@#$%^&*]{6,30})/i);
    if (codeKeywordMatch) {
        console.log('Found code after "Mã đổi:":', codeKeywordMatch[1]);
        return codeKeywordMatch[1];
    }
    
    // Tìm bất kỳ chuỗi ký tự nào có thể là mã (dài 6-30 ký tự, chứa ký tự đặc biệt)
    codeMatch = text.match(/[A-Za-z0-9_\-@#$%^&*]{6,30}/);
    if (codeMatch) {
        console.log('Found code with regex:', codeMatch[0]);
        return codeMatch[0];
    }
    
    return null;
}

function findCardInText(text, cardId) {
    const keywords = CARD_KEYWORDS[cardId] || [];
    const normalizedText = text.toLowerCase();
    
    for (const keyword of keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
            return true;
        }
    }
    
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
        // Hiển thị mã với định dạng -- để người dùng biết
        const displayCode = code.startsWith('--') ? code : `--${code}--`;
        exchangeCode.value = displayCode;
        showToast(`✅ Đã tìm thấy mã: ${displayCode}`, 'success');
    } else {
        showToast('⚠️ Không tìm thấy mã trong văn bản. Vui lòng nhập thủ công.', 'warning');
    }
    
    // 2. Tìm thẻ "đổi đi" và "cần"
    let haveCardId = null;
    let needCardId = null;
    
    // Các pattern tìm kiếm
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
            const before = parts[0].trim();
            const after = parts[1].trim();
            
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
    
    // Highlight success/error
    if (code && haveCardId && needCardId) {
        textInput.classList.add('extract-success');
        setTimeout(() => textInput.classList.remove('extract-success'), 2000);
    } else {
        textInput.classList.add('extract-error');
        setTimeout(() => textInput.classList.remove('extract-error'), 2000);
    }
}

function clearTextInput() {
    textInput.value = '';
    textInput.classList.remove('extract-success', 'extract-error');
}

// ====== TOAST ======
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ====== COPY ======
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

// ====== MARK AS USED ======
function markAsUsed(exchangeId, button) {
    if (button.classList.contains('used')) {
        showToast('Mã này đã được đánh dấu là đã dùng!', 'warning');
        return;
    }
    
    if (!confirm('Xác nhận đã sử dụng mã này thành công?')) return;
    
    db.collection('exchanges').doc(exchangeId).update({
        isUsed: true,
        usedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showToast('✅ Đã đánh dấu mã đã dùng thành công!', 'success');
        button.textContent = '✅ Đã dùng';
        button.classList.add('used');
        const card = button.closest('.exchange-card');
        card.classList.add('used');
        updateSuccessRate();
        // Reload to update list
        loadExchanges(currentFilter.have, currentFilter.need, currentFilter.time, currentFilter.status, currentPage);
    }).catch(error => {
        showToast('Lỗi: ' + error.message, 'error');
    });
}

// ====== SHOW ORIGINAL TEXT ======
function showOriginalText(originalText) {
    if (!originalText) {
        showToast('Không có văn bản gốc để hiển thị!', 'warning');
        return;
    }
    
    const popup = document.createElement('div');
    popup.className = 'original-text-popup';
    popup.innerHTML = `
        <div class="original-text-content">
            <h3>📝 Văn bản gốc</h3>
            <pre id="originalTextContent">${originalText}</pre>
            <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="copyOriginalText()" style="flex: 1;">
                    📋 Copy văn bản
                </button>
                <button class="btn btn-outline" onclick="this.closest('.original-text-popup').remove()" style="flex: 1;">
                    Đóng
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    
    popup.addEventListener('click', (e) => {
        if (e.target === popup) popup.remove();
    });
}

// Hàm copy văn bản gốc
function copyOriginalText() {
    const textElement = document.getElementById('originalTextContent');
    if (!textElement) return;
    
    const text = textElement.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('✅ Đã copy văn bản gốc!', 'success');
        const btn = document.querySelector('.original-text-popup .btn-primary');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✅ Đã copy!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        showToast('✅ Đã copy văn bản gốc!', 'success');
    });
}

// ====== NOTIFICATIONS ======
function toggleNotifications() {
    notificationEnabled = !notificationEnabled;
    if (notificationEnabled) {
        showToast('🔔 Đã bật thông báo', 'success');
        document.getElementById('notificationBell').style.opacity = '1';
    } else {
        showToast('🔕 Đã tắt thông báo', 'warning');
        document.getElementById('notificationBell').style.opacity = '0.5';
    }
}

function showNotification(exchange) {
    if (!notificationEnabled) return;
    
    const haveCard = CARDS.find(c => c.id === exchange.haveCardId);
    const needCard = CARDS.find(c => c.id === exchange.needCardId);
    
    const message = `📤 ${haveCard ? haveCard.name : 'Không rõ'} ➜ 📥 ${needCard ? needCard.name : 'Không rõ'}\nMã: ${exchange.code}`;
    
    notificationMessage.innerHTML = `
        <div style="margin-bottom: 10px;">${message}</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="copyCode('${exchange.code}', this)" style="padding: 6px 12px; font-size: 12px; width: auto;">
                📋 Copy mã
            </button>
            <button class="btn btn-outline" onclick="closeNotificationPopup()" style="padding: 6px 12px; font-size: 12px; width: auto;">
                Đóng
            </button>
        </div>
    `;
    
    notificationPopup.style.display = 'block';
    unreadCount++;
    updateBadge();
    
    setTimeout(() => {
        closeNotificationPopup();
    }, 10000);
}

function closeNotificationPopup() {
    notificationPopup.style.display = 'none';
    unreadCount = 0;
    updateBadge();
}

function updateBadge() {
    if (unreadCount > 0) {
        notificationBadge.style.display = 'inline';
        notificationBadge.textContent = unreadCount;
    } else {
        notificationBadge.style.display = 'none';
    }
}

// ====== UPDATE SUCCESS RATE ======
function updateSuccessRate() {
    const total = allExchanges.length;
    if (total === 0) {
        successRate.textContent = '📊 Tỷ lệ thành công: 0%';
        return;
    }
    
    const used = allExchanges.filter(item => item.isUsed).length;
    const rate = Math.round((used / total) * 100);
    successRate.textContent = `📊 Tỷ lệ thành công: ${rate}% (${used}/${total})`;
}

// ====== FORMAT TIME ======
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

// ====== FILTER BY TIME ======
function filterByTime(exchanges, timeFilter) {
    if (timeFilter === 'all') return exchanges;
    
    const now = new Date();
    let cutoff = new Date();
    
    switch(timeFilter) {
        case '1h':
            cutoff.setHours(now.getHours() - 1);
            break;
        case '24h':
            cutoff.setDate(now.getDate() - 1);
            break;
        case '7d':
            cutoff.setDate(now.getDate() - 7);
            break;
        case '30d':
            cutoff.setDate(now.getDate() - 30);
            break;
        default:
            return exchanges;
    }
    
    return exchanges.filter(item => {
        const createdAt = item.createdAt?.toDate?.() || new Date(item.createdAt);
        return createdAt >= cutoff;
    });
}

// ====== FILTER BY STATUS ======
function filterByStatus(exchanges, statusFilter) {
    if (statusFilter === 'all') return exchanges;
    if (statusFilter === 'used') return exchanges.filter(item => item.isUsed === true);
    if (statusFilter === 'unused') return exchanges.filter(item => item.isUsed !== true);
    return exchanges;
}

// ====== RENDER EXCHANGES ======
function renderExchanges(exchanges, page = 1) {
    if (!exchanges || exchanges.length === 0) {
        exchangeList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <p>Chưa có mã trao đổi nào phù hợp</p>
                <p style="font-size: 14px; margin-top: 8px;">Hãy đăng tải mã của bạn để mọi người cùng trao đổi!</p>
            </div>
        `;
        countBadge.textContent = '0 mã';
        document.getElementById('loadMoreContainer').style.display = 'none';
        updateSuccessRate();
        return;
    }
    
    // Sort by createdAt (newest first)
    const sorted = [...exchanges].sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return timeB - timeA;
    });
    
    totalExchanges = sorted.length;
    
    // Calculate pagination
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, totalExchanges);
    const pageData = sorted.slice(start, end);
    
    let html = '';
    pageData.forEach(item => {
        const haveCard = CARDS.find(c => c.id === item.haveCardId);
        const needCard = CARDS.find(c => c.id === item.needCardId);
        const isUsed = item.isUsed || false;
        const displayCode = item.code.length > 0 ? `--${item.code}--` : item.code;
        
        html += `
            <div class="exchange-card ${isUsed ? 'used' : ''}">
                <div class="card-info">
                    <span class="card-badge have">📤 ${haveCard ? haveCard.name : 'Không rõ'}</span>
                    <span class="card-arrow">➜</span>
                    <span class="card-badge need">📥 ${needCard ? needCard.name : 'Không rõ'}</span>
                    <span class="card-code">${displayCode}</span>
                </div>
                <div class="card-actions">
                    <span class="card-time">⏱️ ${formatTime(item.createdAt)}</span>
                    <button class="copy-btn" onclick="copyCode('${item.code}', this)">📋 Copy mã</button>
                    <button class="used-btn ${isUsed ? 'used' : ''}" onclick="markAsUsed('${item.id}', this)" ${isUsed ? 'disabled' : ''}>
                        ${isUsed ? '✅ Đã dùng' : '✅ Dùng rồi?'}
                    </button>
                    <button class="original-btn" onclick="showOriginalText('${(item.originalText || '').replace(/'/g, "\\'")}')">
                        📝 Xem gốc
                    </button>
                </div>
            </div>
        `;
    });
    
    exchangeList.innerHTML = html;
    countBadge.textContent = `${totalExchanges} mã`;
    
    // Update pagination
    const totalPages = Math.ceil(totalExchanges / pageSize);
    document.getElementById('pageInfo').textContent = `Trang ${page}/${totalPages}`;
    document.getElementById('prevPageBtn').style.display = page > 1 ? 'inline-flex' : 'none';
    document.getElementById('nextPageBtn').style.display = page < totalPages ? 'inline-flex' : 'none';
    document.getElementById('loadMoreContainer').style.display = totalExchanges > pageSize ? 'flex' : 'none';
    
    updateSuccessRate();
}

// ====== LOAD EXCHANGES ======
function loadExchanges(haveCardId = '', needCardId = '', timeFilter = 'all', statusFilter = 'all', page = 1) {
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
        
        // Apply time filter
        let filtered = filterByTime(exchanges, timeFilter);
        // Apply status filter
        filtered = filterByStatus(filtered, statusFilter);
        
        allExchanges = filtered;
        renderExchanges(filtered, page);
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
            
            filtered = filterByTime(filtered, timeFilter);
            filtered = filterByStatus(filtered, statusFilter);
            
            allExchanges = filtered;
            renderExchanges(filtered, page);
        }).catch(() => {
            showToast('Không thể tải dữ liệu. Vui lòng thử lại sau.', 'error');
        });
    });
}

// ====== POST EXCHANGE ======
function postExchange() {
    const haveCardId = parseInt(haveSelect.value);
    const needCardId = parseInt(needSelect.value);
    let code = exchangeCode.value.trim();
    const originalText = textInput.value.trim();
    
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
    
    // Kiểm tra nếu mã vẫn còn chứa -- hoặc [[
    if (code.startsWith('--') && code.endsWith('--')) {
        code = code.substring(2, code.length - 2);
    }
    if (code.startsWith('[[') && code.endsWith(']]')) {
        code = code.substring(2, code.length - 2);
    }
    if (code.startsWith('{') && code.endsWith('}')) {
        code = code.substring(1, code.length - 1);
    }
    if (code.startsWith('*') && code.endsWith('*')) {
        code = code.substring(1, code.length - 1);
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
            originalText: originalText || null,
            isUsed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        exchangesRef.add(data).then(() => {
            showToast('✅ Đăng tải mã thành công!', 'success');
            exchangeCode.value = '';
            haveSelect.value = '';
            needSelect.value = '';
            textInput.value = '';
            textInput.classList.remove('extract-success', 'extract-error');
            currentPage = 1;
            loadExchanges(currentFilter.have, currentFilter.need, currentFilter.time, currentFilter.status, currentPage);
        }).catch(error => {
            showToast('Lỗi: ' + error.message, 'error');
        });
    }).catch(() => {
        const data = {
            haveCardId: haveCardId,
            needCardId: needCardId,
            code: code,
            originalText: originalText || null,
            isUsed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        exchangesRef.add(data).then(() => {
            showToast('✅ Đăng tải mã thành công!', 'success');
            exchangeCode.value = '';
            haveSelect.value = '';
            needSelect.value = '';
            textInput.value = '';
            textInput.classList.remove('extract-success', 'extract-error');
            currentPage = 1;
            loadExchanges(currentFilter.have, currentFilter.need, currentFilter.time, currentFilter.status, currentPage);
        }).catch(error => {
            showToast('Lỗi: ' + error.message, 'error');
        });
    });
}

// ====== PAGINATION ======
function goToPage(page) {
    currentPage = page;
    loadExchanges(currentFilter.have, currentFilter.need, currentFilter.time, currentFilter.status, currentPage);
    // Scroll to top of list
    document.querySelector('.list-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function prevPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

function nextPage() {
    const totalPages = Math.ceil(totalExchanges / pageSize);
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

// ====== APPLY FILTER ======
function applyFilter() {
    const have = filterHave.value;
    const need = filterNeed.value;
    const time = filterTime.value;
    const status = filterStatus ? filterStatus.value : 'all';
    currentFilter = { have, need, time, status };
    currentPage = 1;
    loadExchanges(have, need, time, status, currentPage);
}

function resetFilter() {
    filterHave.value = '';
    filterNeed.value = '';
    filterTime.value = 'all';
    if (filterStatus) filterStatus.value = 'all';
    currentFilter = { have: '', need: '', time: 'all', status: 'all' };
    currentPage = 1;
    loadExchanges('', '', 'all', 'all', currentPage);
}

// ====== REALTIME LISTENER ======
function setupRealtimeListener() {
    let query = exchangesRef.orderBy('createdAt', 'desc');
    
    query.onSnapshot(snapshot => {
        // Only update if no filters are applied
        if (!currentFilter.have && !currentFilter.need && currentFilter.time === 'all' && currentFilter.status === 'all') {
            const exchanges = [];
            let newExchanges = [];
            
            snapshot.docChanges().forEach(change => {
                const data = { id: change.doc.id, ...change.doc.data() };
                if (change.type === 'added') {
                    newExchanges.push(data);
                }
                exchanges.push(data);
            });
            
            allExchanges = exchanges;
            renderExchanges(exchanges, currentPage);
            
            // Show notification for new exchanges
            if (newExchanges.length > 0 && lastNotificationTime) {
                const latest = newExchanges[0];
                const createdAt = latest.createdAt?.toDate?.() || new Date(latest.createdAt);
                if (createdAt > lastNotificationTime) {
                    showNotification(latest);
                }
            }
            
            if (newExchanges.length > 0) {
                lastNotificationTime = new Date();
            }
        }
    }, error => {
        console.warn('Realtime listener error:', error);
    });
}

// ====== INITIALIZE ======
function init() {
    populateSelects();
    loadTheme();
    loadExchanges('', '', 'all', 'all', 1);
    setupRealtimeListener();
    
    exchangeCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            postExchange();
        }
    });
    
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
