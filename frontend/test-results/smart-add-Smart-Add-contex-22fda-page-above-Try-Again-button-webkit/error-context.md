# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - button "Light" [ref=e6] [cursor=pointer]:
        - img [ref=e7]
      - button "Dark" [ref=e13] [cursor=pointer]:
        - img [ref=e14]
      - button "System" [ref=e16] [cursor=pointer]:
        - img [ref=e17]
    - generic [ref=e19]:
      - generic [ref=e21]:
        - img [ref=e23]
        - generic [ref=e26]: Housarr
      - generic [ref=e27]:
        - heading "Welcome back" [level=1] [ref=e28]
        - paragraph [ref=e29]: Sign in to your account to continue
    - generic [ref=e30]:
      - generic [ref=e32]:
        - generic [ref=e33]:
          - generic [ref=e34]: Email
          - textbox "Enter your email" [ref=e36]: test@example.com
        - generic [ref=e37]:
          - generic [ref=e38]: Password
          - textbox "Enter your password" [ref=e40]: password
        - button "Sign in" [ref=e41] [cursor=pointer]
      - paragraph [ref=e42]:
        - text: Don't have an account?
        - link "Sign up" [ref=e43]:
          - /url: /register
  - region "Notifications alt+T"
```