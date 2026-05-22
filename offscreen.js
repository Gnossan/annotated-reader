const firebaseConfig = {
    apiKey: "AIzaSyCmClubetYGavOEVHBUHKQ-_sZZdt-LIWc",
    authDomain: "annotated-reader.firebaseapp.com",
    projectId: "annotated-reader",
    storageBucket: "annotated-reader.firebasestorage.app",
    messagingSenderId: "174635350583",
    appId: "1:174635350583:web:21c316ae78a3aea3bc9db2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Spara token när auth-state ändras
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const token = await user.getIdToken();
        chrome.storage.local.set({
            arUser: { email: user.email, name: user.displayName, photo: user.photoURL },
            arToken: token
        });
    } else {
        chrome.storage.local.remove(["arUser", "arToken"]);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "AUTH_SIGN_IN") {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(async (result) => {
                const token = await result.user.getIdToken();
                sendResponse({
                    token,
                    email: result.user.email,
                    name: result.user.displayName,
                    photo: result.user.photoURL
                });
            })
            .catch(err => sendResponse({ error: err.message }));
        return true;
    }

    if (message.type === "AUTH_SIGN_OUT") {
        auth.signOut()
            .then(() => sendResponse({}))
            .catch(err => sendResponse({ error: err.message }));
        return true;
    }

    if (message.type === "AUTH_GET_TOKEN") {
        const user = auth.currentUser;
        if (!user) { sendResponse({ error: "Not signed in" }); return true; }
        user.getIdToken(true)
            .then(token => {
                chrome.storage.local.set({ arToken: token });
                sendResponse({ token });
            })
            .catch(err => sendResponse({ error: err.message }));
        return true;
    }
});
