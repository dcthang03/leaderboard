# Card Scanner iPhone (MVP)

App web don gian de:
- Bat camera sau iPhone
- Quet la bai tay
- Xuat du lieu JSON san sang ghi vao database sau

## Chay nhanh

1. Mo terminal tai thu muc project:
```powershell
cd D:\4.Rivebase-Test\CameraAI
```

2. Chay web server local:
```powershell
python -m http.server 8080
```

3. Tim IP may tinh (vi du `192.168.1.10`) va tren iPhone mo:
```text
http://192.168.1.10:8080
```

4. Bam `Bat camera sau` -> cap quyen camera -> dat goc tren trai la bai vao khung -> bam `Quet la bai`.

## Cau truc du lieu

Moi lan quet se them 1 object JSON, vi du:

```json
{
  "id": "uuid",
  "scannedAt": "2026-03-07T10:30:00.000Z",
  "rawText": "A SPADE",
  "rank": "A",
  "suit": "S",
  "cardCode": "AS",
  "source": "iphone-rear-camera"
}
```

`cardCode` la ma gon de luu DB (A/K/Q/J/10..2 + S/H/D/C).

## Luu y

- Neu gap loi `trinh duyet khong ho tro camera API`, ly do thuong la dang mo bang HTTP khong an toan tren iPhone.
- Cach on dinh nhat: dung HTTPS tunnel.

### Chay qua HTTPS tunnel (de nghi)

1. Cai `ngrok` tren may tinh.
2. Chay web local:
```powershell
python -m http.server 8080
```
3. Tao tunnel HTTPS:
```powershell
ngrok http 8080
```
4. Mo link `https://...ngrok-free.app` tren iPhone (Safari), sau do bam `Bat camera sau`.
- OCR co the nham neu anh mo, rung tay, hoac goc bai bi che. Nen quet du anh sang va ro goc bai.
- Hien tai du lieu duoc giu trong RAM va hien thi tren man hinh, chua push DB.
