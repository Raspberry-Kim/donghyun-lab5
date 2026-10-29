# 동현콥™: 출처·이용 안내

## 원본 게임

- **Helicopter Game** (SeeThru.co.uk). 디자인 David McCandless, 플래시 Leandro Barreto. 출처 정보: [MobyGames](https://www.mobygames.com/game/163119/helicopter-game/).
- 파일 `swf/helicopter-game.swf`는 사용자가 제공한 원본을 한 바이트도 고치지 않고 담았다(SHA-256 `ed5fbfd0ca488edc6d94c275c609d894d43d87e72922f76332333034cca7e071`). 파일은 그대로이지만, 화면 위 띠의 "COPYRIGHT: SEETHRU.CO.UK" 표시와 seethru.co.uk 링크는 동현콥이 덧씌운 띠(`src/label.js`)가 덮는다. 그 자리에는 "TAKE FLIGHT WITH DONGHYUNCOP!"이 나오고 눌러도 링크가 열리지 않는다. 동굴 벽·장애물의 연두색(0x66FF66)은 원본 도형을 고치지 않고 실행 중에 색 변환만 덧씌워 짙은 크림색(0xC9B48C)으로 보이게 한다. 원본의 헬리콥터는 투명하게 감추고 그 자리에 포동이의 꼬리콥터(`src/dog.js`)를 띄운다. 헬리콥터 그림은 원본 파일 안에 그대로 남아 있으므로, 이 교체로 저작물 문제가 모두 풀리지는 않는다. 원작자의 권리는 이 문서와 페이지의 「원작과 출처」에 밝혀 둔다.
- 원본의 그림·소리·코드의 권리는 원작자에게 있다. 이 저장소의 MIT 라이선스는 원본 SWF에 적용되지 않으며, 원작자의 재배포 허락은 확인하지 못했다. 권리자의 요청이 있으면 내린다.
- 동현콥은 비상업적 보존·교육 목적의 취미 작품이며, 원작자와 관계가 없고 승인도 받지 않았다.

## 동현콥이 새로 만든 것

- 페이지 구성, 동현랭 속력 규약과 예제, 바깥 SWF 생성기(`src/wrapper.js`), 상단 띠 SWF(`src/label.js`, `tools/make-label.py`로 생성), 포동이의 꼬리콥터 SWF(`src/dog.js`, `tools/make-dog.py`로 생성), 세그먼트 글꼴(`tools/seg.py`, `tools/make-font.py`), 원본 해시 확인, 터치 조작 정리, 문서.
- 동현랭 실행기(`src/donghyun.js`)는 [동현랭 저장소](https://github.com/Raspberry-Kim/donghyun-lang)의 v1.53을 고치지 않고 썼다.

## 이용 조건

- **동현콥 코드·문서:** MIT ([LICENSE](LICENSE)). 저작권 © 2026 김동현.
- **원본 SWF:** 원작자 권리. MIT 아님.
- **Ruffle 0.7.1** (`ruffle/`, [ruffle.rs](https://ruffle.rs/)): MIT 또는 Apache-2.0 ([licenses/RUFFLE-MIT.txt](licenses/RUFFLE-MIT.txt), [licenses/RUFFLE-APACHE-2.0.txt](licenses/RUFFLE-APACHE-2.0.txt)).
- **동현랭 실행기:** MIT ([licenses/DONGHYUN-MIT.txt](licenses/DONGHYUN-MIT.txt)).
- **글꼴:** Black Han Sans, Nanum Gothic Coding, Pretendard — SIL Open Font License 1.1 ([licenses](licenses/)).
- **세그먼트 글꼴(상단 띠 글자, DISTANCE·BEST 숫자):** 동현콥이 직접 그렸다. MIT.
- **포동이 그림** (`assets/podongi.png`): 제공자의 그림이다. 코드의 MIT 라이선스와 따로 보며, 그림의 권리는 제공자에게 있다.
