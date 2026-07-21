
        // Import Firebase SDKs
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
        import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
        import { getFirestore, collection, addDoc, getDocs, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyB0v4axY7o2yhsNbpoEAqY_aSewKQJB1SY",
            authDomain: "client-1-29b46.firebaseapp.com",
            projectId: "client-1-29b46",
            storageBucket: "client-1-29b46.firebasestorage.app",
            messagingSenderId: "290906658002",
            appId: "1:290906658002:web:5efc3c0a5a8ac055ea490b",
            measurementId: "G-N76R78FSWH"
        };
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const googleProvider = new GoogleAuthProvider();

        const adminEmail = "carpenterfurniture@admin.com";
        const adminPanelBtn = document.getElementById('admin-panel-btn');
        const adminPanelOverlay = document.getElementById('admin-panel-overlay');
        const adminOrdersList = document.getElementById('admin-orders-list');
        const statPendingOrders = document.getElementById('stat-pending-orders');
        
        const myOrdersBtn = document.getElementById('my-orders-btn');
        const myOrdersOverlay = document.getElementById('my-orders-overlay');
        const customerOrdersList = document.getElementById('customer-orders-list');
        const paymentModal = document.getElementById('payment-modal-mock');

        // Admin Panel Globals
        window.switchAdminTab = function(tabId) {
            document.querySelectorAll('.admin-tab-content').forEach(tab => tab.style.display = 'none');
            document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
            document.getElementById('admin-tab-' + tabId).style.display = 'block';
            event.currentTarget.classList.add('active');
        };

        window.openAdminPanel = function() {
            adminPanelOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            loadOrders();
        };

        window.closeAdminPanel = function() {
            adminPanelOverlay.style.display = 'none';
            document.body.style.overflow = '';
        };

        // Customer Globals
        window.openMyOrders = function() {
            myOrdersOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            loadCustomerOrders();
        };

        window.closeMyOrders = function() {
            myOrdersOverlay.style.display = 'none';
            document.body.style.overflow = '';
        };
        
        window.openPayment = function() {
            paymentModal.style.display = 'flex';
        };

        let unsubOrders = null;
        function loadOrders() {
            try {
                const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));
                if (unsubOrders) unsubOrders();
                unsubOrders = onSnapshot(q, (snapshot) => {
                    adminOrdersList.innerHTML = '';
                    let pendingCount = 0;
                    
                    if (snapshot.empty) {
                        adminOrdersList.innerHTML = '<p style="color:#666;">No orders found.</p>';
                        statPendingOrders.textContent = "0";
                        return;
                    }

                    snapshot.forEach((docSnap) => {
                        const data = docSnap.data();
                        if(data.status === "Pending Approval") pendingCount++;
                        
                        const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Just now';
                        const card = document.createElement('div');
                        card.className = 'admin-order-card';
                        
                        let actionBtn = "";
                        if (data.status === "Pending Approval") {
                            card.style.borderLeftColor = "var(--accent-orange)";
                            actionBtn = `<button onclick="approveOrder('${docSnap.id}')">Approve Order</button>`;
                        } else if (data.status === "Approved - Awaiting Payment") {
                            card.style.borderLeftColor = "var(--luxury-gold)";
                            actionBtn = `<button disabled style="background:#ccc;color:#fff;">Awaiting Payment</button>`;
                        } else {
                            card.style.borderLeftColor = "#25D366";
                        }

                        card.innerHTML = `
                            <div>
                                <h4>Order from: ${data.customerName || 'Guest'}</h4>
                                <p><strong>Items:</strong> ${data.items || 'Unknown'}</p>
                                <p><strong>Status:</strong> <span style="font-weight:bold;">${data.status}</span></p>
                                <p style="font-size: 12px; margin-top: 5px;">${date}</p>
                            </div>
                            <div class="admin-order-actions">
                                ${actionBtn}
                            </div>
                        `;
                        adminOrdersList.appendChild(card);
                    });
                    statPendingOrders.textContent = pendingCount;
                }, (error) => {
                    adminOrdersList.innerHTML = '<p style="color:red;">Error loading orders. (Firebase Config Missing)</p>';
                });
            } catch(e) {
                 adminOrdersList.innerHTML = '<p style="color:red;">Firestore initialization error.</p>';
            }
        }

        window.approveOrder = async function(orderId) {
            try {
                const orderRef = doc(db, "orders", orderId);
                await updateDoc(orderRef, {
                    status: "Approved - Awaiting Payment"
                });
                showToast("Order Approved!", true);
            } catch (e) {
                console.warn(e);
                // Mock behavior if no firebase
                showToast("Order Approved! (Mocked due to missing config)", true);
            }
        };

        let unsubCustomerOrders = null;
        function loadCustomerOrders() {
            if(!auth.currentUser) return;
            try {
                const q = query(collection(db, "orders"), where("customerEmail", "==", auth.currentUser.email));
                if (unsubCustomerOrders) unsubCustomerOrders();
                unsubCustomerOrders = onSnapshot(q, (snapshot) => {
                    customerOrdersList.innerHTML = '';
                    if (snapshot.empty) {
                        customerOrdersList.innerHTML = '<p style="color:#666;">You have no order requests.</p>';
                        return;
                    }

                    snapshot.forEach((docSnap) => {
                        const data = docSnap.data();
                        const card = document.createElement('div');
                        card.className = 'admin-order-card';
                        
                        let actionBtn = "";
                        if (data.status === "Approved - Awaiting Payment") {
                            card.style.borderLeftColor = "var(--luxury-gold)";
                            actionBtn = `<button onclick="openPayment()" style="background:var(--accent-orange); color:white;">Pay Now</button>`;
                        } else if (data.status === "Pending Approval") {
                            card.style.borderLeftColor = "#ccc";
                            actionBtn = `<span style="color:#666; font-size: 14px;">Under Review</span>`;
                        }

                        card.innerHTML = `
                            <div>
                                <h4 style="margin-bottom:10px;">Order Request</h4>
                                <p><strong>Items:</strong> ${data.items || 'Unknown'}</p>
                                <p><strong>Status:</strong> <span style="font-weight:bold;">${data.status}</span></p>
                            </div>
                            <div class="admin-order-actions" style="display:flex; align-items:center;">
                                ${actionBtn}
                            </div>
                        `;
                        customerOrdersList.appendChild(card);
                    });
                }, (error) => {
                    customerOrdersList.innerHTML = '<p style="color:red;">Error loading your orders: ' + error.message + '</p>';
                });
            } catch(e) {
                 customerOrdersList.innerHTML = '<p style="color:red;">Firestore initialization error.</p>';
            }
        }

                let isCheckingOut = false;
        window.handleCheckout = async function() {
            if (isCheckingOut) return;
            if (cart.length === 0) {
                showToast("Your cart is empty!", false);
                return;
            }
            if (!auth.currentUser) {
                showToast("Please log in or create an account to place an order.", false);
                document.getElementById('cart-modal').style.display = 'none';
                document.getElementById('login-modal').classList.add('active');
                return;
            }
            
            isCheckingOut = true;
            let totalItems = cart.length;
            
            try {
                await addDoc(collection(db, "orders"), {
                    customerName: auth.currentUser.displayName || auth.currentUser.email,
                    customerEmail: auth.currentUser.email,
                    items: cart.map(item => item.name).join(', '),
                    totalItems: totalItems,
                    status: "Pending Approval",
                    timestamp: serverTimestamp()
                });
                cart = [];
                updateCartUI();
                document.getElementById('cart-modal').style.display = 'none';
                showToast("Order Request sent for approval! Check 'My Orders'.", true);
            } catch(e) {
                console.warn("Could not save to Firestore.", e);
                showToast("Order Request Sent! (Mock Mode - Config Missing)", true);
                cart = [];
                updateCartUI();
                document.getElementById('cart-modal').style.display = 'none';
            } finally {
                isCheckingOut = false;
            }
        }
        }

        // DOM Elements
        const loginModal = document.getElementById('login-modal');
        const loginTrigger = document.getElementById('login-trigger');
        const loginModalClose = document.getElementById('login-modal-close');
        const authUnauthView = document.getElementById('auth-unauthenticated-view');
        const authAuthView = document.getElementById('auth-authenticated-view');
        const userEmailDisplay = document.getElementById('user-email-display');
        const authStateIcon = loginTrigger.querySelector('i');
        const googleLoginBtn = document.getElementById('google-login-btn');
        const emailAuthBtn = document.getElementById('email-auth-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const emailInput = document.getElementById('auth-email');
        const passInput = document.getElementById('auth-password');
        const authTitle = document.getElementById('auth-title');
        const authSubtitle = document.getElementById('auth-subtitle');
        const authSwitchLink = document.getElementById('auth-switch-link');
        const authSwitchText = document.getElementById('auth-switch-text');
        let isSignUpMode = false;

        loginTrigger.addEventListener('click', () => { loginModal.classList.add('active'); });
        loginModalClose.addEventListener('click', () => { loginModal.classList.remove('active'); });
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) loginModal.classList.remove('active');
        });

        authSwitchLink.addEventListener('click', () => {
            isSignUpMode = !isSignUpMode;
            if (isSignUpMode) {
                authTitle.textContent = "Create Account";
                authSubtitle.textContent = "Join us to save your favorite pieces.";
                emailAuthBtn.textContent = "Sign Up";
                authSwitchText.textContent = "Already have an account? ";
                authSwitchLink.textContent = "Sign In";
            } else {
                authTitle.textContent = "Welcome Back";
                authSubtitle.textContent = "Sign in to access your wishlist and bag.";
                emailAuthBtn.textContent = "Sign In";
                authSwitchText.textContent = "Don't have an account? ";
                authSwitchLink.textContent = "Sign Up";
            }
        });

        googleLoginBtn.addEventListener('click', () => {
            signInWithPopup(auth, googleProvider).then(() => {
                showToast("Successfully logged in with Google!");
                loginModal.classList.remove('active');
            }).catch((error) => {
                showToast("Google sign in failed.", false);
            });
        });

        emailAuthBtn.addEventListener('click', () => {
            const email = emailInput.value;
            const pass = passInput.value;

            // DEV BYPASS
            if (email && pass === 'admin123') {
                auth.currentUser = { email: email, displayName: email }; // mock auth object
                document.getElementById('login-modal').classList.remove('active');
                authStateIcon.classList.replace('fa-user', 'fa-user-check');
                authStateIcon.style.color = 'var(--accent-orange)';
                authUnauthView.style.display = 'none';
                authAuthView.style.display = 'block';
                userEmailDisplay.textContent = email;
                
                if(myOrdersBtn) myOrdersBtn.style.display = 'block';

                if (email === adminEmail) {
                    if(adminPanelBtn) adminPanelBtn.style.display = 'block';
                    showToast('Admin Dev Mode Activated!', true);
                    openAdminPanel();
                } else {
                    if(adminPanelBtn) adminPanelBtn.style.display = 'none';
                    showToast('Customer Dev Mode Activated!', true);
                }
                return;
            }

            if (!email || !pass) {
                showToast("Please enter both email and password.", false);
                return;
            }

            if (isSignUpMode) {
                createUserWithEmailAndPassword(auth, email, pass).then(() => {
                    showToast("Account created successfully!");
                    loginModal.classList.remove('active');
                }).catch((error) => showToast("Signup failed.", false));
            } else {
                signInWithEmailAndPassword(auth, email, pass).then(() => {
                    showToast("Successfully signed in!");
                    loginModal.classList.remove('active');
                }).catch((error) => showToast("Signin failed: " + error.message, false));
            }
        });

        logoutBtn.addEventListener('click', () => {
            // Force UI Reset for Developer Bypass
            authStateIcon.classList.add('fa-user');
            authStateIcon.classList.remove('fa-user-check');
            authStateIcon.style.color = '';
            authUnauthView.style.display = 'block';
            authAuthView.style.display = 'none';
            if(adminPanelBtn) adminPanelBtn.style.display = 'none';
            if(myOrdersBtn) myOrdersBtn.style.display = 'none';
            auth.currentUser = null;

            signOut(auth).then(() => {
                showToast("Logged out successfully.");
                loginModal.classList.remove('active');
                if (adminPanelOverlay && adminPanelOverlay.style.display === 'flex') closeAdminPanel();
                if (myOrdersOverlay && myOrdersOverlay.style.display === 'flex') closeMyOrders();
            }).catch(() => {
                showToast("Logged out successfully.", true);
                loginModal.classList.remove('active');
                if (adminPanelOverlay && adminPanelOverlay.style.display === 'flex') closeAdminPanel();
                if (myOrdersOverlay && myOrdersOverlay.style.display === 'flex') closeMyOrders();
            });
        });

        onAuthStateChanged(auth, (user) => {
            if (user) {
                authStateIcon.classList.remove('fa-user');
                authStateIcon.classList.add('fa-user-check');
                authStateIcon.style.color = "var(--accent-orange)";
                authUnauthView.style.display = 'none';
                authAuthView.style.display = 'block';
                userEmailDisplay.textContent = user.email || "User";
                
                if(myOrdersBtn) myOrdersBtn.style.display = 'block';

                if (user.email === adminEmail) {
                    if(adminPanelBtn) adminPanelBtn.style.display = 'block';
                } else {
                    if(adminPanelBtn) adminPanelBtn.style.display = 'none';
                }
            } else {
                authStateIcon.classList.add('fa-user');
                authStateIcon.classList.remove('fa-user-check');
                authStateIcon.style.color = "";
                authUnauthView.style.display = 'block';
                authAuthView.style.display = 'none';
                if(adminPanelBtn) adminPanelBtn.style.display = 'none';
                if(myOrdersBtn) myOrdersBtn.style.display = 'none';
            }
        });
    