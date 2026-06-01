GRADING APP - LOCAL JSON SERVER CLEAN VERSION

CACH CHAY LOCAL
1) Giai nen thu muc app
2) Neu may da cai Node.js: bam Start-Grading-App.bat
   Hoac mo terminal trong thu muc nay va chay: node script.js
3) Mo trinh duyet vao: http://127.0.0.1:3000

DU LIEU DUOC LUU O DAU?
- Du lieu that KHONG nam trong repo app nua.
- Mac dinh server luu du lieu tai:
  C:\Users\<ten-user>\Documents\GradingAppData

Trong thu muc nay server tu tao:
- grading-data.json
- settings.json
- draft-data.json
- trash.json
- backups\auto
- backups\daily
- backups\monthly
- backups\manual

VI SAO KHONG LUU DATA TRONG REPO?
- Tranh push nham du lieu hoc sinh len GitHub
- Tranh mat data khi tai ban app moi va ghi de thu muc code
- Moi may co data rieng, khong dong bo giua nguoi dung
- Chrome / Brave / Edge tren cung 1 may dung chung du lieu neu cung chay Local JSON Server

GITHUB / GITIGNORE
- Repo chi nen push source code.
- Khong push data that.
- File .gitignore da chan:
  data/
  backups/
  grading-data.json
  settings.json
  draft-data.json
  trash.json
  *.xlsx
  *.zip
  *.exe
  node_modules/

DATA TEMPLATE
- Thu muc data-template chi chua file mau rong.
- Co the push len GitHub vi khong co du lieu hoc sinh.

LUU Y VE LOCAL JSON SERVER
- GitHub Pages khong tu chay duoc Local JSON Server.
- Muon luu local JSON, may nguoi dung phai chay Start-Grading-App.bat hoac node script.js.
- Neu khong chay server, app co the fallback tam vao localStorage cua trinh duyet, nhung khong dong bo Chrome/Brave.

BACKUP / RESTORE
- Auto backup: tao truoc khi ghi data chinh, giu 100 ban gan nhat
- Daily backup: giu 30 ngay gan nhat
- Monthly backup: giu 12 thang gan nhat
- Manual backup: tao bang nut Backup / Restore trong app
- Soft delete: data bi xoa duoc dua vao trash de co the restore

BAT DAU TEST TU DAU
- Ban nay khong tao truong/lop/hoc sinh mac dinh.
- Lan dau mo app se trong, ban tu tao truong, khoi, lop, ky nang, bai lam va nhap diem.

IMPORT / EXPORT EXCEL
- Bam Nhap Excel de import file .xlsx duoc xuat tu app
- Bam cac nut Xuat de export Excel
- Khi xuat, app co hoi co muon them sheet Static hay khong
- Sheet Static gom xep hang, nhom diem va bieu do ti le phan tram
