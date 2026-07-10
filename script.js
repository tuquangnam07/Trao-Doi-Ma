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

// Initialize selects
function populateSelects() {
    const selects = [haveSelect, needSelect, filterHave, filterNeed];
    
    selects.forEach(select => {
        // Clear existing options (keep first empty option)
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

// Show toast notification
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto hide
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
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
        // Fallback
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
    
    // Sort by time (newest first)
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

// Load exchanges from Firebase with filter
function loadExchanges(haveCardId = '', needCardId = '') {
    loadingSpinner.style.display = 'block';
    exchangeList.innerHTML = '';
    
    let query = exchangesRef.orderBy('createdAt', 'desc');
    
    if (haveCardId && needCardId) {
        // Both filters
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
        showToast('Lỗi tải dữ liệu: ' + error.message, 'error');
        
        // Try fallback: load all and filter client-side
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

// Post new exchange
function postExchange() {
    const haveCardId = parseInt(haveSelect.value);
    const needCardId = parseInt(needSelect.value);
    const code = exchangeCode.value.trim();
    
    // Validate
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
    
    // Check for duplicate code
    exchangesRef.where('code', '==', code).get().then(snapshot => {
        if (!snapshot.empty) {
            showToast('Mã này đã được đăng tải!', 'error');
            return;
        }
        
        // Save to Firebase
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
            loadExchanges(currentFilter.have, currentFilter.need);
        }).catch(error => {
            showToast('Lỗi: ' + error.message, 'error');
        });
    }).catch(() => {
        // Fallback: try to save anyway
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

// Real-time listener for new exchanges
function setupRealtimeListener() {
    let query = exchangesRef.orderBy('createdAt', 'desc').limit(50);
    
    query.onSnapshot(snapshot => {
        // Only update if we're not in a filtered state
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
    
    // Enter key support
    exchangeCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            postExchange();
        }
    });
}

// Run when DOM ready
document.addEventListener('DOMContentLoaded', init);