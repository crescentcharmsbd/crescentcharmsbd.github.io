/* ==========================================================================
   1. GLOBAL VARIABLES & INIT
   ========================================================================== */
const API_URL = "https://script.google.com/macros/s/AKfycbxv1ET9q6VIuqdZJ3z3oPGjEMsbYJFz8L1hQwGvbRfBLecsu1zGMlihwKQtAg1a070/exec";

// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Quick View state
let qvImages = [];
let qvIndex = 0;
let qvQty = 1;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    renderCart(); // Updates both main cart and mini cart
    setupNavigation();
    setupTiltEffect();
});

/* ==========================================================================
   2. PRODUCT LOADING & GRID
   ========================================================================== */
async function loadProducts() {
    const grid = document.getElementById("productGrid");
    const loader = document.getElementById("loader");

    if (!grid) {
        console.warn("Product grid not found on this page.");
        return;
    }

    try {
        const res = await fetch(API_URL);
        const products = await res.json();
        
        grid.innerHTML = "";

        products.forEach((product, i) => {
            const photos = product.photos 
                ? product.photos.split("|").map(u => u.trim()).filter(Boolean) 
                : [];
            const main = photos[0] || "https://via.placeholder.com/300";

            const card = document.createElement("div");
            card.className = "card";
            card.dataset.photos = JSON.stringify(photos);

            card.innerHTML = `
                <div class="img-wrap" onclick='openProduct(${JSON.stringify(product)})'>
                    <img src="${main}" class="main-img">
                    <div class="quick-eye" onclick='quickView(${JSON.stringify(product)}); event.stopPropagation()'>👁</div>
                </div>
                <h3 onclick='openProduct(${JSON.stringify(product)})'>${product.name}</h3>
                <div class="price">৳ ${product.price}</div>
                <button class="product-btn" onclick='addToCartFancy(this,${JSON.stringify(product)})'>
                    <span class="btn-icon">🛒</span>
                    <span class="btn-text">Add to Cart</span>
                </button>
            `;

            grid.appendChild(card);
            
            // Staggered fade-in animation
            setTimeout(() => {
                card.classList.add("show");
            }, i * 150);
        });

        enableImageHover();

        // Safe Loader Removal
        if (loader) {
            loader.style.transition = "opacity 0.5s ease";
            loader.style.opacity = "0";
            setTimeout(() => { loader.style.display = "none"; }, 500);
        }

    } catch (err) {
        console.error("API Error:", err);
        // Hide loader even if there is an error so user isn't stuck
        if (loader) loader.style.display = "none";
        grid.innerHTML = "<p style='text-align:center;'>Unable to load products. Please refresh.</p>";
    }
}

// Update the closeQV to handle the "Pop-out" transition
function closeQV() {
  const qv = document.getElementById("quickView");
  const qvBox = qv.querySelector(".qv-box");
  
  qvBox.style.transform = "scale(0.8) translateY(20px)";
  qv.style.opacity = "0";
  
  setTimeout(() => {
    qv.style.display = "none";
  }, 400);
}

// Hover animation for product images
function enableImageHover() {
    document.querySelectorAll(".card").forEach(card => {
        const imgs = JSON.parse(card.dataset.photos || "[]");
        if (imgs.length <= 1) return;

        let i = 0;
        const img = card.querySelector(".main-img");

        card.addEventListener("mouseenter", () => {
            card._imgTimer = setInterval(() => {
                i = (i + 1) % imgs.length;
                img.style.opacity = 0;
                setTimeout(() => { img.src = imgs[i]; img.style.opacity = 1; }, 200);
            }, 1200);
        });

        card.addEventListener("mouseleave", () => {
            clearInterval(card._imgTimer);
            img.src = imgs[0];
        });
    });
}

/* ==========================================================================
   3. CART LOGIC (Unified)
   ========================================================================== */

// Fancy Button Animation + Add
function addToCartFancy(btn, product) {
    btn.classList.add("loading");
    const txt = btn.querySelector(".btn-text");
    if(txt) txt.innerText = "Adding...";
    
    setTimeout(() => {
        addToCart(product);
        btn.classList.remove("loading");
        if(txt) txt.innerText = "Added ✓";
        setTimeout(() => { if(txt) txt.innerText = "Add to Cart"; }, 1200);
    }, 600);
}

// Core Add Function
function addToCart(product) {
    const found = cart.find(p => p.name === product.name);
    if (found) found.qty += (product.qty || 1);
    else { 
        product.qty = product.qty || 1; 
        cart.push(product); 
    }
    saveCart();
    renderCart();
}

// Remove Item
function removeFromCart(i) {
    cart.splice(i, 1);
    saveCart();
    renderCart();
}

// Change Quantity
function changeQty(i, delta) {
    cart[i].qty += delta;
    if (cart[i].qty <= 0) cart.splice(i, 1);
    saveCart();
    renderCart();
}

// Clear Cart
function clearCart() {
    if(confirm("Are you sure you want to clear your cart?")) {
        cart = [];
        saveCart();
        renderCart();
    }
}

// LocalStorage Save
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

// Unified Render: Updates Main Cart Section, Mini Cart, and Totals
function renderCart() {
    const mainBox = document.getElementById("cartItems");
    const miniBox = document.getElementById("miniCartItems");
    const totalBox = document.getElementById("cartTotal");
    const miniTotalBox = document.getElementById("miniCartTotal");
    const miniCount = document.getElementById("miniCartCount"); // If you have a badge count

    let total = 0;
    let count = 0;
    let mainHTML = "";
    let miniHTML = "";

    if (cart.length === 0) {
        // Empty State
        const emptyMsg = "<p style='text-align:center;color:#777;padding:20px;'>Your bag is empty ✨</p>";
        if (mainBox) mainBox.innerHTML = emptyMsg;
        if (miniBox) miniBox.innerHTML = emptyMsg;
        if (totalBox) totalBox.innerText = "Total: ৳ 0";
        if (miniTotalBox) miniTotalBox.innerText = "Total: ৳ 0";
        if (miniCount) miniCount.innerText = "0";
        return;
    }

    // Build HTML
    cart.forEach((p, i) => {
        const photos = p.photos ? p.photos.split("|") : [];
        const img = photos[0] || "https://via.placeholder.com/150";
        const subtotal = p.price * p.qty;
        total += subtotal;
        count += p.qty;

        // Main Cart Item
        mainHTML += `
            <div class="cart-item">
                <img src="${img}">
                <div class="cart-info">
                    <h4>${p.name}</h4>
                    <span>৳ ${p.price}</span>
                    <div class="qty-box">
                        <button class="qty-btn" onclick="changeQty(${i},-1)">−</button>
                        <b>${p.qty}</b>
                        <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
                    </div>
                </div>
                <div class="cart-actions">
                    <div><b>৳ ${subtotal}</b></div>
                    <button class="remove-btn" onclick="removeFromCart(${i})">✕</button>
                </div>
            </div>
        `;

        // Mini Cart Item
        miniHTML += `
            <div class="mini-cart-item">
                <img src="${img}" width="40" height="40">
                <div style="flex:1">
                    <div style="font-size:13px;font-weight:600">${p.name}</div>
                    <div style="font-size:12px;color:#777">${p.qty} x ৳${p.price}</div>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${i})" style="font-size:14px">✕</button>
            </div>
        `;
    });

    // Inject HTML
    if (mainBox) mainBox.innerHTML = mainHTML;
    if (miniBox) miniBox.innerHTML = miniHTML;
    
    // Update Totals
    const totalText = `Total: ৳ ${total}`;
    if (totalBox) totalBox.innerText = totalText;
    if (miniTotalBox) miniTotalBox.innerText = totalText;
    if (miniCount) miniCount.innerText = count;
}

/* ==========================================================================
   4. NAVIGATION & SCROLLING
   ========================================================================== */
function setupNavigation() {
  const hamburger = document.querySelector(".hamburger");
  const nav = document.querySelector("nav");
  const closeBtn = document.querySelector(".hamburger-close");

  if (!hamburger || !nav) return;

  hamburger.addEventListener("click", () => {
    nav.classList.add("show");
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      nav.classList.remove("show");
    });
  }

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("show");
    });
  });
}


function goCheckout(btn) {
    btn.classList.add("loading");
    const txt = btn.querySelector(".btn-text");
    if(txt) txt.innerText = "Processing...";
    
    setTimeout(() => {
        alert("Checkout page coming next 😈");
        btn.classList.remove("loading");
        if(txt) txt.innerText = "Proceed to Checkout";
    }, 1500);
}

function goToCart() {
    const cartSection = document.getElementById("cart");
    if (cartSection) {
        cartSection.scrollIntoView({ behavior: "smooth" });
    }
}

/* ==========================================================================
   5. QUICK VIEW & MODAL
   ========================================================================== */
function quickView(product) {
    qvImages = product.photos ? product.photos.split("|") : ["https://via.placeholder.com/300"];
    qvIndex = 0;
    qvQty = 1;

    document.getElementById("qvImg").src = qvImages[0];
    document.getElementById("qvName").innerText = product.name;
    document.getElementById("qvPrice").innerText = "৳ " + product.price;
    document.getElementById("qvDesc").innerText = product.desc || "";
    document.getElementById("qvQty").innerText = qvQty;

    // Render thumbnails
    const thumbs = document.getElementById("qvThumbs");
    thumbs.innerHTML = "";
    qvImages.forEach((img, i) => {
        const t = document.createElement("img");
        t.src = img;
        t.classList.toggle("active", i === 0);
        t.onclick = () => { qvIndex = i; updateQVImage(); };
        thumbs.appendChild(t);
    });

    // Floating particles
    const particleContainer = document.querySelector(".qv-bg-particles");
    if(particleContainer) {
        particleContainer.innerHTML = "";
        for (let i = 0; i < 12; i++) {
            const span = document.createElement("span");
            span.style.top = `${Math.random() * 100}%`;
            span.style.left = `${Math.random() * 100}%`;
            span.style.animationDelay = `${Math.random() * 2}s`;
            particleContainer.appendChild(span);
        }
    }

    // Add to cart binding
    const qvAddBtn = document.getElementById("qvAdd");
    // Remove old listeners to prevent multiple adds
    const newBtn = qvAddBtn.cloneNode(true);
    qvAddBtn.parentNode.replaceChild(newBtn, qvAddBtn);
    newBtn.onclick = () => addToCartFancy(newBtn, { ...product, qty: qvQty });

    // Show popup
    const qv = document.getElementById("quickView");
    qv.style.display = "flex";
    setTimeout(() => qv.style.opacity = 1, 10);
}

function closeQV() {
    const qv = document.getElementById("quickView");
    qv.style.opacity = 0;
    setTimeout(() => {
        qv.style.display = "none";
    }, 300);
}

function qvPrev() { qvIndex = (qvIndex - 1 + qvImages.length) % qvImages.length; updateQVImage(); }
function qvNext() { qvIndex = (qvIndex + 1) % qvImages.length; updateQVImage(); }

function updateQVImage() {
    const mainImg = document.getElementById("qvImg");
    mainImg.style.opacity = 0;
    setTimeout(() => { mainImg.src = qvImages[qvIndex]; mainImg.style.opacity = 1; }, 200);
    document.querySelectorAll("#qvThumbs img").forEach((img, i) => {
        img.classList.toggle("active", i === qvIndex);
    });
}

function changeQVQty(delta) {
    qvQty = Math.max(1, qvQty + delta);
    document.getElementById("qvQty").innerText = qvQty;
}

// Swipe Support for Quick View
const qvMainImgWrap = document.querySelector(".qv-img-wrapper"); // Fixed selector class
if(qvMainImgWrap) {
    let startX = 0;
    qvMainImgWrap.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
    qvMainImgWrap.addEventListener("touchend", e => {
        const endX = e.changedTouches[0].clientX;
        if (endX - startX > 50) qvPrev();
        else if (startX - endX > 50) qvNext();
    });
}

/* ==========================================================================
   6. MISC EFFECTS (TILT)
   ========================================================================== */
function setupTiltEffect() {
    if (window.innerWidth <= 900) return; // Only on desktop

    document.addEventListener("mousemove", e => {
        document.querySelectorAll(".card").forEach(card => {
            const r = card.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            
            if (x > 0 && y > 0 && x < r.width && y < r.height) {
                const rx = (y - r.height / 2) / 20;
                const ry = (x - r.width / 2) / 20;
                card.style.transform = `rotateX(${-rx}deg) rotateY(${ry}deg) translateY(-12px) scale(1.03)`;
            } else {
                card.style.transform = "";
            }
        });
    });
}

function openProduct(product) {
    localStorage.setItem("activeProduct", JSON.stringify(product));
    window.location.href = "product.html";
}

const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("navLinks");
const hamburgerClose = document.getElementById("hamburgerClose");

hamburger.addEventListener("click", () => {
  nav.classList.add("show");
});

hamburgerClose.addEventListener("click", () => {
  nav.classList.remove("show");
});

document.querySelectorAll("#navLinks a").forEach(link => {
  link.addEventListener("click", () => {
    nav.classList.remove("show");
  });
});

hamburger.addEventListener("click", () => {
  nav.classList.add("show");
  document.body.style.overflow = "hidden";
});

closeBtn.addEventListener("click", () => {
  nav.classList.remove("show");
  document.body.style.overflow = "";
});
