const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAw-ttOCa7O3nCvhoVArI4reIqEPwNHaUs",
  authDomain: "eventpass-4f1c9.firebaseapp.com",
  projectId: "eventpass-4f1c9",
  storageBucket: "eventpass-4f1c9.firebasestorage.app",
  messagingSenderId: "468095188105",
  appId: "1:468095188105:web:3699d212d61c863bd79a58",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanRegistrations() {
  console.log('Consultando registros en Firestore...');
  const snapshot = await getDocs(collection(db, 'registrations'));
  console.log(`Encontrados: ${snapshot.size} registros de asistentes.`);

  for (const docSnap of snapshot.docs) {
    console.log(`Borrando registro: ${docSnap.id} (${docSnap.data().fullName})`);
    await deleteDoc(doc(db, 'registrations', docSnap.id));
  }

  console.log('✅ Todos los asistentes han sido eliminados de Firestore.');
  process.exit(0);
}

cleanRegistrations().catch((err) => {
  console.error('Error limpiando registros:', err);
  process.exit(1);
});
