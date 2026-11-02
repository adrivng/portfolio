const sections = document.querySelectorAll('main section');
const navLinks = document.querySelectorAll('nav a');

const observer = new IntersectionObserver((entries) => {

    entries.forEach((entry) => {

        if (entry.isIntersecting) {

            navLinks.forEach((link) => {
                link.classList.remove('active');
            });

            const activeLink = document.querySelector(
                `nav a[href="#${entry.target.id}"]`
            );

            if (activeLink) {
                activeLink.classList.add('active');
            }

        }

    });

}, {
    threshold: 0,
    rootMargin: '-20% 0px -65% 0px'
});

sections.forEach((section) => {
    observer.observe(section);
});