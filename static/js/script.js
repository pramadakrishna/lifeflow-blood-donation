$(document).ready(function() {
    // Initialize AOS (Animate On Scroll)
    AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 50
    });

    // Navigation Scroll Effect
    $(window).scroll(function() {
        if ($(this).scrollTop() > 50) {
            $('.navbar').addClass('scrolled');
        } else {
            $('.navbar').removeClass('scrolled');
        }
    });

    // Live Stats Counter Animation
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                element.text(target.toLocaleString());
                clearInterval(timer);
            } else {
                element.text(Math.floor(start).toLocaleString());
            }
        }, 16);
    }

    // Fetch and animate stats
    $.get('/api/stats', function(data) {
        animateCounter($('#donorCount'), data.total_donors);
        animateCounter($('#lifeCount'), data.lives_saved);
    });

    // Form Progress Bar
    function updateProgress() {
        const form = $('#donorForm')[0];
        const totalFields = form.querySelectorAll('input[required], select[required]').length;
        let filledFields = 0;
        
        form.querySelectorAll('input[required], select[required]').forEach(field => {
            if (field.value.trim() !== '') filledFields++;
        });
        
        const progress = (filledFields / totalFields) * 100;
        $('#formProgress').css('width', progress + '%');
    }

    $('#donorForm input, #donorForm select').on('input change', updateProgress);

    // First Time Donor Toggle
    $('#first_time').change(function() {
        if(this.checked) {
            $('#lastDateField').slideUp(300);
            $('#last_date').val('');
            $(this).closest('.form-check').find('.badge').text('Welcome!').removeClass('bg-info').addClass('bg-success');
        } else {
            $('#lastDateField').slideDown(300);
            $(this).closest('.form-check').find('.badge').text('Returning Donor').removeClass('bg-success').addClass('bg-info');
        }
    });

    // Enhanced Form Validation
    $('#donorForm').submit(function(event) {
        let isValid = true;
        const form = $(this);

        // Reset previous validations
        form.find('.is-invalid').removeClass('is-invalid');
        
        // Check required fields
        form.find('input[required], select[required]').each(function() {
            if($(this).val().trim() === '') {
                $(this).addClass('is-invalid');
                isValid = false;
                $(this).shake(); 
            }
        });

        // Validate Age
        const age = parseInt($('#age').val());
        if(age < 18 || age > 65 || isNaN(age)) {
            $('#age').addClass('is-invalid');
            $('#ageWarning').removeClass('d-none');
            isValid = false;
        } else {
            $('#ageWarning').addClass('d-none');
        }

        // Validate Email
        const email = $('#email').val();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailPattern.test(email)) {
            $('#email').addClass('is-invalid');
            isValid = false;
        }

        // Validate Phone (10 digits)
        const phone = $('#phone').val().replace(/\D/g,'');
        if(phone.length !== 10) {
            $('#phone').addClass('is-invalid');
            isValid = false;
        }

        if(!isValid) {
            event.preventDefault();
            // Show error toast
            showToast('Please fix the errors before submitting', 'error');
        } else {
            // Show loading state
            $('#submitBtn').prop('disabled', true);
            $('.submit-text').addClass('d-none');
            $('.loading-text').removeClass('d-none');
        }
    });

    // Blood Type Info Popup
    window.showBloodInfo = function(bloodType) {
        const compatibility = {
            'A+': { canGive: ['A+', 'AB+'], canReceive: ['A+', 'A-', 'O+', 'O-'] },
            'A-': { canGive: ['A+', 'A-', 'AB+', 'AB-'], canReceive: ['A-', 'O-'] },
            'B+': { canGive: ['B+', 'AB+'], canReceive: ['B+', 'B-', 'O+', 'O-'] },
            'B-': { canGive: ['B+', 'B-', 'AB+', 'AB-'], canReceive: ['B-', 'O-'] },
            'O+': { canGive: ['O+', 'A+', 'B+', 'AB+'], canReceive: ['O+', 'O-'] },
            'O-': { canGive: ['All Types'], canReceive: ['O-'] },
            'AB+': { canGive: ['AB+'], canReceive: ['All Types'] },
            'AB-': { canGive: ['AB+', 'AB-'], canReceive: ['A-', 'B-', 'AB-', 'O-'] }
        };
        
        const info = compatibility[bloodType];
        const modal = `
            <div class="modal fade" id="bloodModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content glass-card border-0">
                        <div class="modal-header border-0">
                            <h5 class="modal-title fw-bold">
                                <i class="fas fa-tint text-danger me-2"></i>Blood Type ${bloodType}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <h6 class="text-success fw-bold"><i class="fas fa-hand-holding-heart me-2"></i>Can Donate To:</h6>
                                <p>${info.canGive.join(', ')}</p>
                            </div>
                            <div>
                                <h6 class="text-primary fw-bold"><i class="fas fa-ambulance me-2"></i>Can Receive From:</h6>
                                <p>${info.canReceive.join(', ')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(modal);
        $('#bloodModal').modal('show');
        $('#bloodModal').on('hidden.bs.modal', function() {
            $(this).remove();
        });
    };

    // Contact Donor Function
    window.contactDonor = function(name) {
        showToast(`Contact request sent to ${name}!`, 'success');
    };

    // Toast Notification System
    function showToast(message, type = 'info') {
        const colors = {
            success: 'bg-success',
            error: 'bg-danger',
            info: 'bg-primary'
        };
        
        const toast = `
            <div class="toast align-items-center text-white ${colors[type]} border-0 position-fixed top-0 end-0 m-3" 
                 role="alert" style="z-index: 9999; animation: slideIn 0.3s ease;">
                <div class="d-flex">
                    <div class="toast-body fw-semibold">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        $('body').append(toast);
        const toastElement = $('.toast').last();
        toastElement.toast({ delay: 3000 });
        toastElement.toast('show');
        
        setTimeout(() => {
            toastElement.remove();
        }, 3500);
    }

    // Confetti Effect for Success Page
    if($('#confetti-canvas').length) {
        initConfetti();
    }

    function initConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#dc2626', '#fbbf24', '#22c55e', '#3b82f6', '#ec4899'];

        for(let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 10 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: Math.random() * 3 + 2,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 10 - 5
            });
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach((p, i) => {
                p.y += p.speed;
                p.rotation += p.rotationSpeed;
                
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                ctx.restore();
                
                if(p.y > canvas.height) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                }
            });
            
            requestAnimationFrame(animate);
        }
        
        animate();
        
        // Stop after 5 seconds
        setTimeout(() => {
            canvas.style.opacity = '0';
            canvas.style.transition = 'opacity 2s';
        }, 5000);
    }

    // Custom jQuery Shake Animation
    $.fn.shake = function() {
        this.each(function() {
            $(this).css('animation', 'shake 0.5s');
            setTimeout(() => {
                $(this).css('animation', '');
            }, 500);
        });
        return this;
    };

    // Add shake keyframes dynamically
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `)
        .appendTo('head');
});