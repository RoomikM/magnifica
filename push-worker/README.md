# Push-сповіщення майстрам (закритий застосунок)

Потрібен безкоштовний акаунт Cloudflare (без банківської картки). Налаштування разова, ~10 хв.

1. Відкрийте `https://roomikm.github.io/magnifica/push-worker/keygen.html`, натисніть «Створити ключі».
   Публічний ключ надішліть мені в чат. Приватний ключ нікому не надсилайте, він потрібен лише в кроці 4.
2. Зареєструйтесь на https://dash.cloudflare.com/sign-up (лише e-mail і пароль).
3. Workers & Pages → Create → Create Worker → назва `magnifica-push` → Deploy → Edit code.
   Видаліть увесь код, вставте вміст файлу `worker.js` з цієї папки → Deploy.
4. Worker → Settings → Variables and Secrets → Add:
   - `VAPID_PUBLIC` (тип Text): публічний ключ
   - `VAPID_PRIVATE` (тип **Secret**): приватний ключ
   - `SUBJECT` (Text): `mailto:ваш-email`
   Збережіть (Deploy).
5. Надішліть мені адресу Worker (вигляд `https://magnifica-push.xxxx.workers.dev`), я впишу її та публічний ключ у `push-config.js`.
6. У Firestore Rules додайте блок `push` (див. нижче) і натисніть Publish.
7. Майстер у «Кабінеті» натискає «Увімкнути сповіщення» (на iPhone спершу додати сайт на головний екран).

## Правила Firestore (додати поруч з іншими `match`)

    match /push/{id} {
      allow read: if owner() || (can('apptView') && can('apptAdd'));
      allow create, update: if owner() || (staffOk() && request.resource.data.uid == request.auth.uid && request.resource.data.mid == mid());
      allow delete: if owner() || (signed() && resource.data.uid == request.auth.uid) || (can('apptView') && can('apptAdd'));
    }
