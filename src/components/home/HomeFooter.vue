<template>
  <footer class="home-footer">
    <svg class="footer-constellation" viewBox="0 0 1200 80" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <g stroke="rgba(232,230,224,0.12)" stroke-width="1">
        <line x1="80" y1="56" x2="200" y2="30" />
        <line x1="200" y1="30" x2="330" y2="48" />
        <line x1="820" y1="40" x2="940" y2="20" />
        <line x1="940" y1="20" x2="1080" y2="44" />
      </g>
      <g fill="rgba(232,230,224,0.4)">
        <circle cx="80" cy="56" r="2.4" />
        <circle cx="200" cy="30" r="3" />
        <circle cx="330" cy="48" r="2" />
        <circle cx="600" cy="60" r="1.6" />
        <circle cx="820" cy="40" r="2.2" />
        <circle cx="940" cy="20" r="3" />
        <circle cx="1080" cy="44" r="2" />
      </g>
    </svg>

    <div class="footer-inner">
      <div class="footer-brand">
        <span class="footer-logo">星途</span>
        <p class="footer-slogan">穿越星海，抵达你的新星</p>
      </div>

      <nav class="footer-links" aria-label="页脚导航">
        <div class="link-group">
          <p class="group-title">功能</p>
          <router-link to="/resume">星舰档案</router-link>
          <router-link to="/apply-sites">星港导航</router-link>
          <router-link to="/mock-interview">跃迁试炼</router-link>
          <router-link to="/interview">航行日志</router-link>
        </div>
        <div class="link-group">
          <p class="group-title">支持</p>
          <router-link to="/quota">星能补给站</router-link>
          <router-link to="/login">登舰验证</router-link>
        </div>
      </nav>
    </div>

    <p class="footer-copy">星途 · 从简历到 Offer 的智能求职助手</p>
  </footer>
</template>

<script setup lang="ts">
defineOptions({ name: 'HomeFooter' })
</script>

<style scoped>
.home-footer {
  position: relative;
  margin-top: 24px;
  padding: 8px 0 28px;
  border-top: 1px solid rgba(232, 230, 224, 0.1);
}

.footer-constellation {
  position: absolute;
  top: -40px;
  left: 0;
  width: 100%;
  height: 80px;
  pointer-events: none;
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
  padding: 28px 8px 20px;
}

.footer-logo {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--xt-text-on-dark);
}

.footer-slogan {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--xt-text-on-dark-muted);
}

.footer-links {
  display: flex;
  gap: 56px;
}

.link-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-title {
  margin: 0 0 2px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #e8a33d;
}

.link-group a {
  font-size: 13px;
  color: var(--xt-text-on-dark-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.link-group a:hover {
  color: var(--xt-text-on-dark);
}

.footer-copy {
  margin: 0;
  padding: 0 8px;
  font-size: 12px;
  color: var(--xt-text-muted);
  text-align: center;
}

@media (max-width: 768px) {
  .footer-inner {
    flex-direction: column;
    gap: 24px;
  }

  .footer-links {
    gap: 40px;
  }
}
</style>
