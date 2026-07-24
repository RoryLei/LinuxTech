/**
 * Topic: Users & Permissions
 */
const TOPIC_USERS = {
  "id": "users",
  "icon": "👥",
  "title": "Users & Permissions",
  "description": "Manage accounts, groups, and sudo configuration",
  "sections": [
    {
      "title": "User Management",
      "content": "\n          <pre><code># Add a user\nsudo useradd -m -s /bin/bash username\nsudo passwd username\n\n# Delete a user\nsudo userdel -r username\n\n# Modify a user\nsudo usermod -aG docker username  # Add to group\nsudo usermod -s /bin/zsh username # Change shell\n\n# View user info\nid username\nwhoami</code></pre>\n        "
    },
    {
      "title": "Group Management",
      "content": "\n          <pre><code># Add a group\nsudo groupadd developers\n\n# Add user to group\nsudo usermod -aG developers username\n\n# View group members\ngetent group developers\n\n# Delete a group\nsudo groupdel developers</code></pre>\n        "
    },
    {
      "title": "sudo Configuration",
      "content": "\n          <p>Control which users can run admin commands via <code>/etc/sudoers</code>:</p>\n          <pre><code># Edit sudoers (always use visudo)\nsudo visudo\n\n# Allow user to run all commands\nusername ALL=(ALL:ALL) ALL\n\n# Allow group passwordless execution\n%developers ALL=(ALL) NOPASSWD: ALL\n\n# Restrict to specific commands\nusername ALL=(ALL) /usr/bin/systemctl restart nginx</code></pre>\n        "
    }
  ]
};
