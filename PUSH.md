# Push LabyrinthOS to GitHub

The repository was built locally but not pushed due to missing authentication.

## Steps to push

1. Ensure you are in the `LabyrinthOS` directory:
   ```bash
   cd /home/aradhya/.openclaw/workspace/LabyrinthOS
   ```

2. Configure Git if not already:
   ```bash
   git config user.email "your-email@example.com"
   git config user.name "Your Name"
   ```

3. Add remote (if not already):
   ```bash
   git remote add origin https://github.com/Aradhya648/LabyrinthOS.git
   ```

4. Push:
   ```bash
   git push -u origin main
   ```

If HTTPS pushes fail due to authentication, either:

- Use a personal access token (classic) in the URL: `https://<TOKEN>@github.com/Aradhya648/LabyrinthOS.git` (replace `<TOKEN>`), or
- Set up SSH and change remote to `git@github.com:Aradhya648/LabyrinthOS.git`, then push.

All commits are ready in local `main` branch.
