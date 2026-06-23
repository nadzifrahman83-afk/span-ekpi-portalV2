import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Resolve with specific database ID configured in the applet config
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-8dc69621-8190-4cd0-856c-d4a209a0d1df');
export const auth = getAuth(app);

// Sign in anonymously if enabled, or fallback gracefully to public access mode
signInAnonymously(auth)
  .then(() => {
    console.log('Firebase Anonymous Authentication succeeded.');
  })
  .catch((err) => {
    console.info('Firebase Anonymous Authentication not enabled on backend (this is expected and okay, falling back to public client):', err instanceof Error ? err.message : err);
  });

// Validate Connection to Firestore as per critical skill instructions
async function testConnection() {
  try {
    // Read from valid yearRecords subpath since Global Safety Net restricts other paths
    await getDocFromServer(doc(db, 'yearRecords', 'test_connection_ping'));
    console.log('Tested connection successfully with Firestore server.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firestore connection error: Please check your Firebase configuration or internet connection.');
    }
  }
}
testConnection();

// Structured Custom Error Handling as per skill's strict requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
