# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - button "Light" [ref=e6] [cursor=pointer]:
        - img [ref=e7]
      - button "Dark" [ref=e17] [cursor=pointer]:
        - img [ref=e18]
      - button "System" [ref=e20] [cursor=pointer]:
        - img [ref=e21]
    - generic [ref=e25]:
      - generic [ref=e27]:
        - img [ref=e29]
        - generic [ref=e32]: Housarr
      - generic [ref=e33]:
        - heading "Welcome back" [level=1] [ref=e34]
        - paragraph [ref=e35]: Sign in to your account to continue
    - generic [ref=e36]:
      - generic [ref=e38]:
        - generic [ref=e39]:
          - generic [ref=e40]: Email
          - textbox "Enter your email" [ref=e42]: test@example.com
        - generic [ref=e43]:
          - generic [ref=e44]: Password
          - textbox "Enter your password" [ref=e46]: password
        - button "Sign in" [ref=e47] [cursor=pointer]
      - paragraph [ref=e48]:
        - text: Don't have an account?
        - link "Sign up" [ref=e49] [cursor=pointer]:
          - /url: /register
  - region "Notifications alt+T"
```