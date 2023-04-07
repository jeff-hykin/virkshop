git checkout levels/1_bare_minimum && \
git checkout levels/2_minimal      && git merge levels/1_bare_minimum && git push && \
git checkout levels/3_standard     && git merge levels/2_minimal      && git push && \
git checkout levels/4_extras       && git merge levels/3_standard     && git push