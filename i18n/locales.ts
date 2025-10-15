export type Locale = 'ru' | 'en' | 'kk';

export type Translations = {
  [key: string]: string | Translations;
};

export const locales: { [key in Locale]: Translations } = {
  ru: {
    login_title: 'Вход в админ-панель VCL',
    login_subtitle: 'Введите учетные данные, чтобы продолжить',
    login_username_label: 'Имя пользователя',
    login_password_label: 'Пароль',
    login_button: 'Войти',
    login_button_loading: 'Входим...',
    error_login_failed: 'Не удалось выполнить вход',
    header_welcome: 'Добро пожаловать,',
    header_daily_credits: 'Кредиты за день',
    admin_open_button: 'Админ-панель',
    button_logout: 'Выйти',
    admin_dashboard_title: 'Центр управления лимитами',
    admin_dashboard_subtitle: 'Настраивайте дневные лимиты и отслеживайте использование',
    admin_back_to_app: 'Назад к генератору',
    admin_usage_date: 'Текущая дата',
    admin_daily_credits: 'Израсходовано за день',
    admin_refresh_button: 'Обновить',
    admin_reset_button: 'Сбросить на сегодня',
    admin_daily_credit_limit: 'Глобальный дневной лимит кредитов',
    admin_category_column: 'Категория',
    admin_used_column: 'Использовано',
    admin_limit_column: 'Дневной лимит',
    admin_no_categories: 'Категории еще не настроены',
    admin_saving_button: 'Сохраняем...',
    admin_save_button: 'Сохранить лимиты',
    admin_usage_saved: 'Лимиты успешно сохранены',
    admin_usage_reset: 'Счетчики на сегодня сброшены',
    admin_limit_unlimited: 'Без лимита',
    app_title: 'VCL - AI студия для вашего бизнеса',
    app_header: 'VCL AI Studio',
    app_header_new: 'VCL - Визуальные решения для бизнеса',
    app_subheader: 'Профессиональная AI-обработка изображений для вашего бизнеса',
    app_subheader_new: 'Превратите ваши идеи в потрясающие визуальные решения с VCL AI',
    tooltip_go_home: 'Вернуться к началу',
    footer_made_by: '© 2024 VCL Studio - Powered by',
    footer_follow_cta: 'Профессиональные визуальные решения для вашего бизнеса. VCL - ваш партнер в создании контента.',
    
    // Category Selector
    category_selector_title: 'Какой тип фотографий вам нужен?',
    category_selector_subtitle: 'Выберите категорию, подходящую для вашей сферы деятельности.',

    // Categories
    category_product_photo_name: 'Packshot Generator',
    category_product_photo_desc: 'Создание профессиональных пекшотов продуктов',
    category_model_product_name: 'Модель с продуктом', 
    category_model_product_desc: 'Размещение продукта на модели',
    category_concept_art_name: 'Концепт-арт',
    category_concept_art_desc: 'Создание художественных концепций',
    category_storyboard_name: 'Раскадровка',
    category_storyboard_desc: 'Создание поэтапных раскадровок',
    category_angle_change_name: 'Изменить ракурс',
    category_angle_change_desc: 'Смена ракурса объекта',
    category_model_reskin_name: 'Рескин модели',
    category_model_reskin_desc: 'Переодевание модели в новую одежду',
    category_collage_name: 'Коллаж',
    category_collage_desc: 'Создание и AI-обработка коллажей',

    // Generator
    generator_title_suffix: 'Преобразование фото',
    alert_upload_required_image: 'Пожалуйста, загрузите необходимое изображение.',
    
    // Result Page
    result_title: 'Результаты генерации изображений',
    result_image_alt_prefix: 'Результат генерации',
    button_download: 'Скачать',
    button_back_to_home: 'Вернуться на главную',
    button_edit_options: 'Изменить параметры',
    button_regenerate: 'Сгенерировать заново с теми же настройками',
    alert_download_failed: 'Не удалось скачать изображение.',

    // Loading
    loading_message_1: 'AI придумывает лучший кадр...',
    loading_message_2: 'Настраиваем освещение, подождите...',
    loading_message_3: 'Ищем идеальную композицию...',
    loading_message_4: 'Прорисовываем детали...',
    loading_message_5: 'Почти готово! Ожидайте отличный результат!',
    loading_submessage: 'Генерация изображения может занять 1-2 минуты.',
    
    // Errors
    error_generation_failed: 'Не удалось сгенерировать изображение.',

    // Buttons & Common UI
    button_upload_file: 'Загрузить файл',
    button_select_other_file: 'Выбрать другой файл',
    text_or_drag: 'или перетащите',
    text_max_size: 'макс. 10МБ',
    button_generate: 'Сгенерировать AI фото (3 изображения)',
    aria_label_remove_image: 'Удалить изображение',
    aria_label_back_to_categories: 'Вернуться к выбору категорий',

    // General Options
    option_custom: "Настраиваемый",
    
    // Fields
    field_productImage_label: "Изображение продукта",
    field_productImage_info: "Загрузите фотографию вашего продукта",
    field_productName_label: "Название продукта",
    field_productName_placeholder: "Например: Телефон iPhone 15",
    field_cameraAngle_label: "Ракурс камеры",
    field_conceptPreset_label: "Концепция пресета",
    field_customConcept_label: "Пользовательская концепция",
    field_customConcept_placeholder: "Опишите желаемый стиль и атмосферу",
    field_consistencyReferenceImage_label: "Референс изображение",
    field_consistencyReferenceImage_info: "Загрузите изображение для сохранения стиля",
    field_customRequest_label: "Дополнительные пожелания",
    field_customRequest_placeholder: "Опишите любые дополнительные требования",
    field_modelImage_label: "Изображение модели",
    field_modelImage_info: "Загрузите фотографию модели",
    field_shotType_label: "Тип кадра",
    field_concept_description_label: "Описание концепции",
    field_concept_description_placeholder: "Опишите вашу креативную идею",
    field_art_style_label: "Художественный стиль",
    field_custom_style_label: "Пользовательский стиль",
    field_custom_style_placeholder: "Опишите желаемый художественный стиль",
    field_story_description_label: "Описание истории",
    field_story_description_placeholder: "Опишите историю, которую хотите рассказать",
    field_frame_type_label: "Тип кадра",
    field_frame_count_label: "Количество кадров",
    field_target_angle_label: "Целевой ракурс",
    field_maintain_background_label: "Сохранить фон",
    field_transformation_type_label: "Тип трансформации",
    field_face_swap_image_label: "Изображение для замены лица",
    field_face_swap_image_info: "Загрузите фото лица для замены",
    field_target_gender_label: "Целевой пол",
    field_target_age_label: "Целевой возраст",
    field_target_ethnicity_label: "Целевая этническая принадлежность",
    field_outfit_description_label: "Описание наряда",
    field_outfit_description_placeholder: "Опишите желаемый наряд",
    field_full_transform_description_label: "Полное описание трансформации",
    field_full_transform_description_placeholder: "Опишите все изменения",
    field_style_preset_label: "Стилевой пресет",

    // Camera Options
    option_camera_default: "По умолчанию/фронтальный",
    option_camera_top: "Сверху",
    option_camera_45: "45 градусов",
    option_camera_closeup: "Крупный план",

    // Concept Options
    option_concept_warm: "Теплый и уютный",
    option_concept_modern: "Современный и чистый",
    option_concept_isolated: "Изолированный фон",
    option_concept_lifestyle: "Лайфстайл",

    // Shot Options
    option_shot_full: "В полный рост",
    option_shot_upper: "По пояс",
    option_shot_closeup: "Крупный план",

    // Art Style Options
    option_style_realistic: "Реалистичный",
    option_style_artistic: "Художественный",
    option_style_fantasy: "Фэнтези",
    option_style_scifi: "Научная фантастика",

    // Frame Options
    option_frame_sequence: "Последовательность",
    option_frame_before_after: "До и после",
    option_frame_process: "Процесс",
    option_frame_usage: "Использование",
    option_count_3: "3 кадра",
    option_count_4: "4 кадра",
    option_count_6: "6 кадров",

    // Angle Options
    option_angle_front: "Спереди",
    option_angle_back: "Сзади",
    option_angle_left: "Слева",
    option_angle_right: "Справа",
    option_angle_top: "Сверху",
    option_angle_bottom: "Снизу",
    option_angle_45: "45 градусов",

    // Background Options
    option_maintain_yes: "Да",
    option_maintain_no: "Нет",

    // Transformation Options
    option_transform_outfit: "Смена наряда",
    option_transform_face_swap: "Замена лица",
    option_transform_demographics: "Демографические изменения",
    option_transform_full: "Полная трансформация",

    // Gender Options
    option_gender_keep: "Оставить текущий",
    option_gender_male: "Мужской",
    option_gender_female: "Женский",
    option_gender_non_binary: "Небинарный",

    // Age Options
    option_age_keep: "Оставить текущий",
    option_age_child: "Ребенок",
    option_age_teen: "Подросток",
    option_age_young_adult: "Молодой взрослый",
    option_age_middle_aged: "Средних лет",
    option_age_elderly: "Пожилой",

    // Ethnicity Options
    option_ethnicity_keep: "Оставить текущую",
    option_ethnicity_caucasian: "Европеоидная",
    option_ethnicity_african: "Африканская",
    option_ethnicity_asian: "Азиатская",
    option_ethnicity_hispanic: "Латиноамериканская",
    option_ethnicity_middle_eastern: "Ближневосточная",
    option_ethnicity_mixed: "Смешанная",

    // Style Options
    option_style_casual: "Повседневный",
    option_style_formal: "Официальный",
    option_style_sporty: "Спортивный",
    option_style_trendy: "Модный"
  },

  en: {
    login_title: 'Sign in to VCL Admin',
    login_subtitle: 'Enter your credentials to continue',
    login_username_label: 'Username',
    login_password_label: 'Password',
    login_button: 'Sign in',
    login_button_loading: 'Signing in...',
    error_login_failed: 'Login failed',
    header_welcome: 'Welcome back,',
    header_daily_credits: 'Daily credits',
    admin_open_button: 'Admin dashboard',
    button_logout: 'Logout',
    admin_dashboard_title: 'Usage Control Center',
    admin_dashboard_subtitle: 'Manage daily limits and monitor consumption',
    admin_back_to_app: 'Back to generator',
    admin_usage_date: 'Current date',
    admin_daily_credits: 'Daily credits used',
    admin_refresh_button: 'Refresh',
    admin_reset_button: 'Reset today',
    admin_daily_credit_limit: 'Global daily credit limit',
    admin_category_column: 'Category',
    admin_used_column: 'Used today',
    admin_limit_column: 'Daily limit',
    admin_no_categories: 'No categories configured yet',
    admin_saving_button: 'Saving...',
    admin_save_button: 'Save limits',
    admin_usage_saved: 'Limits saved successfully',
    admin_usage_reset: 'Usage counters for today were reset',
    admin_limit_unlimited: 'Unlimited',
    app_title: 'VCL - AI Studio for Your Business',
    app_header: 'VCL AI Studio',
    app_header_new: 'VCL - Visual Solutions for Business',
    app_subheader: 'Professional AI image processing for your business needs',
    app_subheader_new: 'Transform your ideas into stunning visual solutions with VCL AI',
    tooltip_go_home: 'Back to Start',
    footer_made_by: '© 2024 VCL Studio - Powered by',
    footer_follow_cta: 'Professional visual solutions for your business. VCL - your content creation partner.',

    // Category Selector
    category_selector_title: 'What kind of photo do you need?',
    category_selector_subtitle: 'Please select a category that fits your business.',

    // Categories
    category_product_photo_name: 'Packshot Generator',
    category_product_photo_desc: 'Create professional product packshots',
    category_model_product_name: 'Model with Product', 
    category_model_product_desc: 'Place product on model',
    category_concept_art_name: 'Concept Art',
    category_concept_art_desc: 'Create artistic concepts',
    category_storyboard_name: 'Storyboard',
    category_storyboard_desc: 'Create step-by-step storyboards',
    category_angle_change_name: 'Change Angle',
    category_angle_change_desc: 'Change object perspective',
    category_model_reskin_name: 'Model Reskin',
    category_model_reskin_desc: 'Change model outfit',
    category_collage_name: 'Collage',
    category_collage_desc: 'Create and AI-enhance collages',

    // Generator
    generator_title_suffix: 'Photo Transformation',
    alert_upload_required_image: 'Please upload the required image.',

    // Result Page
    result_title: 'Generated Image Results',
    result_image_alt_prefix: 'Generated result',
    button_download: 'Download',
    button_back_to_home: 'Back to Home',
    button_edit_options: 'Edit Options',
    button_regenerate: 'Regenerate with Same Options',
    alert_download_failed: 'Failed to download image.',

    // Loading
    loading_message_1: 'The AI is conceptualizing the best shot...',
    loading_message_2: 'Adjusting the lighting, one moment...',
    loading_message_3: 'Finding the perfect composition...',
    loading_message_4: 'Rendering details...',
    loading_message_5: 'Almost done! Expect great results!',
    loading_submessage: 'Image generation may take 1-2 minutes.',

    // Errors
    error_generation_failed: 'Failed to generate image.',

    // Buttons & Common UI
    button_upload_file: 'Upload File',
    button_select_other_file: 'Select Another File',
    text_or_drag: 'or drag',
    text_max_size: 'max 10MB',
    button_generate: 'Generate AI Photo (3 images)',
    aria_label_remove_image: 'Remove image',
    aria_label_back_to_categories: 'Back to category selection',

    // General Options
    option_custom: "Custom",

    // Fields
    field_productImage_label: "Product Image",
    field_productImage_info: "Upload a photo of your product",
    field_productName_label: "Product Name",
    field_productName_placeholder: "e.g.: iPhone 15 Phone",
    field_cameraAngle_label: "Camera Angle",
    field_conceptPreset_label: "Concept Preset",
    field_customConcept_label: "Custom Concept",
    field_customConcept_placeholder: "Describe desired style and atmosphere",
    field_consistencyReferenceImage_label: "Reference Image",
    field_consistencyReferenceImage_info: "Upload an image to maintain style consistency",
    field_customRequest_label: "Additional Requests",
    field_customRequest_placeholder: "Describe any additional requirements",
    field_modelImage_label: "Model Image",
    field_modelImage_info: "Upload a photo of the model",
    field_shotType_label: "Shot Type",
    field_concept_description_label: "Concept Description",
    field_concept_description_placeholder: "Describe your creative idea",
    field_art_style_label: "Art Style",
    field_custom_style_label: "Custom Style",
    field_custom_style_placeholder: "Describe desired artistic style",
    field_story_description_label: "Story Description",
    field_story_description_placeholder: "Describe the story you want to tell",
    field_frame_type_label: "Frame Type",
    field_frame_count_label: "Frame Count",
    field_target_angle_label: "Target Angle",
    field_maintain_background_label: "Maintain Background",
    field_transformation_type_label: "Transformation Type",
    field_face_swap_image_label: "Face Swap Image",
    field_face_swap_image_info: "Upload a face photo for replacement",
    field_target_gender_label: "Target Gender",
    field_target_age_label: "Target Age",
    field_target_ethnicity_label: "Target Ethnicity",
    field_outfit_description_label: "Outfit Description",
    field_outfit_description_placeholder: "Describe the desired outfit",
    field_full_transform_description_label: "Full Transformation Description",
    field_full_transform_description_placeholder: "Describe all changes",
    field_style_preset_label: "Style Preset",

    // Camera Options
    option_camera_default: "Default/Front",
    option_camera_top: "Top View",
    option_camera_45: "45 Degrees",
    option_camera_closeup: "Close-up",

    // Concept Options
    option_concept_warm: "Warm and Cozy",
    option_concept_modern: "Modern and Clean",
    option_concept_isolated: "Isolated Background",
    option_concept_lifestyle: "Lifestyle",

    // Shot Options
    option_shot_full: "Full Body",
    option_shot_upper: "Upper Body",
    option_shot_closeup: "Close-up",

    // Art Style Options
    option_style_realistic: "Realistic",
    option_style_artistic: "Artistic",
    option_style_fantasy: "Fantasy",
    option_style_scifi: "Sci-Fi",

    // Frame Options
    option_frame_sequence: "Sequence",
    option_frame_before_after: "Before & After",
    option_frame_process: "Process",
    option_frame_usage: "Usage",
    option_count_3: "3 frames",
    option_count_4: "4 frames",
    option_count_6: "6 frames",

    // Angle Options
    option_angle_front: "Front",
    option_angle_back: "Back",
    option_angle_left: "Left",
    option_angle_right: "Right",
    option_angle_top: "Top",
    option_angle_bottom: "Bottom",
    option_angle_45: "45 degrees",

    // Background Options
    option_maintain_yes: "Yes",
    option_maintain_no: "No",

    // Transformation Options
    option_transform_outfit: "Outfit Change",
    option_transform_face_swap: "Face Swap",
    option_transform_demographics: "Demographic Changes",
    option_transform_full: "Full Transformation",

    // Gender Options
    option_gender_keep: "Keep Current",
    option_gender_male: "Male",
    option_gender_female: "Female",
    option_gender_non_binary: "Non-binary",

    // Age Options
    option_age_keep: "Keep Current",
    option_age_child: "Child",
    option_age_teen: "Teen",
    option_age_young_adult: "Young Adult",
    option_age_middle_aged: "Middle-aged",
    option_age_elderly: "Elderly",

    // Ethnicity Options
    option_ethnicity_keep: "Keep Current",
    option_ethnicity_caucasian: "Caucasian",
    option_ethnicity_african: "African",
    option_ethnicity_asian: "Asian",
    option_ethnicity_hispanic: "Hispanic",
    option_ethnicity_middle_eastern: "Middle Eastern",
    option_ethnicity_mixed: "Mixed",

    // Style Options
    option_style_casual: "Casual",
    option_style_formal: "Formal",
    option_style_sporty: "Sporty",
    option_style_trendy: "Trendy"
  },

  kk: {
    login_title: 'VCL әкімдік панеліне кіру',
    login_subtitle: 'Жалғастыру үшін деректеріңізді енгізіңіз',
    login_username_label: 'Пайдаланушы аты',
    login_password_label: 'Құпия сөз',
    login_button: 'Кіру',
    login_button_loading: 'Кіруде...',
    error_login_failed: 'Кіру сәтсіз аяқталды',
    header_welcome: 'Қош келдіңіз,',
    header_daily_credits: 'Күндік кредиттер',
    admin_open_button: 'Әкімдік панелі',
    button_logout: 'Шығу',
    admin_dashboard_title: 'Лимиттерді басқару орталығы',
    admin_dashboard_subtitle: 'Күндік лимиттерді баптап, қолдануды бақылаңыз',
    admin_back_to_app: 'Генераторға оралу',
    admin_usage_date: 'Ағымдағы күн',
    admin_daily_credits: 'Күндік жұмсалған',
    admin_refresh_button: 'Жаңарту',
    admin_reset_button: 'Бүгінгісін тазарту',
    admin_daily_credit_limit: 'Жалпы күндік кредит лимиті',
    admin_category_column: 'Санат',
    admin_used_column: 'Қолданылды',
    admin_limit_column: 'Күндік лимит',
    admin_no_categories: 'Әзірге санаттар жоқ',
    admin_saving_button: 'Сақталуда...',
    admin_save_button: 'Лимиттерді сақтау',
    admin_usage_saved: 'Лимиттер сәтті сақталды',
    admin_usage_reset: 'Күндік есептегіштер тазартылды',
    admin_limit_unlimited: 'Шексіз',
    app_title: 'VCL - Сіздің бизнесіңіз үшін AI студиясы',
    app_header: 'VCL AI Studio',
    app_header_new: 'VCL - Бизнес үшін визуалды шешімдер',
    app_subheader: 'Сіздің бизнес қажеттіліктеріңіз үшін кәсіби AI сурет өңдеу',
    app_subheader_new: 'Идеяларыңызды VCL AI арқылы керемет визуалды шешімдерге айналдырыңыз',
    tooltip_go_home: 'Басына оралу',
    footer_made_by: '© 2024 VCL Studio - қуатталған',
    footer_follow_cta: 'Сіздің бизнесіңіз үшін кәсіби визуалды шешімдер. VCL - сіздің контент жасау серіктесіңіз.',

    // Category Selector
    category_selector_title: 'Сізге қандай түрдегі фотосурет керек?',
    category_selector_subtitle: 'Сіздің қызметіңізге сәйкес келетін санатты таңдаңыз.',

    // Categories
    category_product_photo_name: 'Өнім фотосурті',
    category_product_photo_desc: 'Кәсіби өнім фотосуреттерін жасау',
    category_model_product_name: 'Өніммен модель', 
    category_model_product_desc: 'Өнімді модельге орналастыру',
    category_concept_art_name: 'Концепт-арт',
    category_concept_art_desc: 'Көркем концепцияларды жасау',
    category_storyboard_name: 'Сюжеттік кадрлар',
    category_storyboard_desc: 'Кезең-кезеңмен сюжеттік кадрларды жасау',
    category_angle_change_name: 'Бұрышты өзгерту',
    category_angle_change_desc: 'Объектінің көзқарасын өзгерту',
    category_model_reskin_name: 'Модель рескині',
    category_model_reskin_desc: 'Модельдің киімін өзгерту',
    category_collage_name: 'Коллаж',
    category_collage_desc: 'Коллаждарды жасау және AI арқылы жақсарту',

    // Generator
    generator_title_suffix: 'Фото түрлендіру',
    alert_upload_required_image: 'Қажетті суретті жүктеп салыңыз.',

    // Result Page
    result_title: 'Жасалған сурет нәтижелері',
    result_image_alt_prefix: 'Жасалған нәтиже',
    button_download: 'Жүктеп алу',
    button_back_to_home: 'Басты бетке оралу',
    button_edit_options: 'Параметрлерді өзгерту',
    button_regenerate: 'Дәл сол баптаулармен қайта жасау',
    alert_download_failed: 'Суретті жүктеп алу сәтсіз аяқталды.',

    // Loading
    loading_message_1: 'AI ең жақсы кадрды ойластырып жатыр...',
    loading_message_2: 'Жарықтандыруды реттеп жатырмыз, күте тұрыңыз...',
    loading_message_3: 'Керемет композицияны іздеп жатырмыз...',
    loading_message_4: 'Егжей-тегжейлерді салып жатырмыз...',
    loading_message_5: 'Дерлік дайын! Тамаша нәтижені күтіңіз!',
    loading_submessage: 'Сурет жасау 1-2 минут уақыт алуы мүмкін.',

    // Errors
    error_generation_failed: 'Сурет жасау сәтсіз аяқталды.',

    // Buttons & Common UI
    button_upload_file: 'Файл жүктеу',
    button_select_other_file: 'Басқа файл таңдау',
    text_or_drag: 'немесе апарып тастаңыз',
    text_max_size: 'макс 10МБ',
    button_generate: 'AI фото жасау (3 сурет)',
    aria_label_remove_image: 'Суретті жою',
    aria_label_back_to_categories: 'Санат таңдауға оралу',

    // General Options
    option_custom: "Теңшеулі",

    // Fields
    field_productImage_label: "Өнім суреті",
    field_productImage_info: "Өніміңіздің фотосуретін жүктеп салыңыз",
    field_productName_label: "Өнім атауы",
    field_productName_placeholder: "мысалы: iPhone 15 Телефоны",
    field_cameraAngle_label: "Камера бұрышы",
    field_conceptPreset_label: "Концепция пресеті",
    field_customConcept_label: "Пайдаланушы концепциясы",
    field_customConcept_placeholder: "Қалаған стиль мен атмосфераны сипаттаңыз",
    field_consistencyReferenceImage_label: "Анықтама суреті",
    field_consistencyReferenceImage_info: "Стиль үйлесімділігін сақтау үшін сурет жүктеп салыңыз",
    field_customRequest_label: "Қосымша сұраулар",
    field_customRequest_placeholder: "Кез келген қосымша талаптарды сипаттаңыз",
    field_modelImage_label: "Модель суреті",
    field_modelImage_info: "Модельдің фотосуретін жүктеп салыңыз",
    field_shotType_label: "Кадр түрі",
    field_concept_description_label: "Концепция сипаттамасы",
    field_concept_description_placeholder: "Шығармашылық идеяңызды сипаттаңыз",
    field_art_style_label: "Көркем стилі",
    field_custom_style_label: "Пайдаланушы стилі",
    field_custom_style_placeholder: "Қалаған көркем стильді сипаттаңыз",
    field_story_description_label: "Тарих сипаттамасы",
    field_story_description_placeholder: "Айтқыңыз келетін тарихты сипаттаңыз",
    field_frame_type_label: "Кадр түрі",
    field_frame_count_label: "Кадр саны",
    field_target_angle_label: "Мақсатты бұрыш",
    field_maintain_background_label: "Фонды сақтау",
    field_transformation_type_label: "Түрлендіру түрі",
    field_face_swap_image_label: "Бет ауыстыру суреті",
    field_face_swap_image_info: "Ауыстыру үшін бет фотосуретін жүктеп салыңыз",
    field_target_gender_label: "Мақсатты жыныс",
    field_target_age_label: "Мақсатты жас",
    field_target_ethnicity_label: "Мақсатты этникалық тиістілік",
    field_outfit_description_label: "Киім сипаттамасы",
    field_outfit_description_placeholder: "Қалаған киімді сипаттаңыз",
    field_full_transform_description_label: "Толық түрлендіру сипаттамасы",
    field_full_transform_description_placeholder: "Барлық өзгерістерді сипаттаңыз",
    field_style_preset_label: "Стиль пресеті",

    // Camera Options
    option_camera_default: "Әдепкі/алдыңғы",
    option_camera_top: "Жоғарыдан",
    option_camera_45: "45 градус",
    option_camera_closeup: "Жақын план",

    // Concept Options
    option_concept_warm: "Жылы және жайлы",
    option_concept_modern: "Заманауи және таза",
    option_concept_isolated: "Оқшауланған фон",
    option_concept_lifestyle: "Өмір салты",

    // Shot Options
    option_shot_full: "Толық бойы",
    option_shot_upper: "Жоғарғы жартысы",
    option_shot_closeup: "Жақын план",

    // Art Style Options
    option_style_realistic: "Шынайы",
    option_style_artistic: "Көркемдік",
    option_style_fantasy: "Фэнтези",
    option_style_scifi: "Ғылыми фантастика",

    // Frame Options
    option_frame_sequence: "Дәйектілік",
    option_frame_before_after: "Дейін және кейін",
    option_frame_process: "Процесс",
    option_frame_usage: "Пайдалану",
    option_count_3: "3 кадр",
    option_count_4: "4 кадр",
    option_count_6: "6 кадр",

    // Angle Options
    option_angle_front: "Алдыңғы",
    option_angle_back: "Артқы",
    option_angle_left: "Сол жақ",
    option_angle_right: "Оң жақ",
    option_angle_top: "Жоғарғы",
    option_angle_bottom: "Төменгі",
    option_angle_45: "45 градус",

    // Background Options
    option_maintain_yes: "Иә",
    option_maintain_no: "Жоқ",

    // Transformation Options
    option_transform_outfit: "Киім өзгерту",
    option_transform_face_swap: "Бет ауыстыру",
    option_transform_demographics: "Демографиялық өзгерістер",
    option_transform_full: "Толық түрлендіру",

    // Gender Options
    option_gender_keep: "Қазіргіні сақтау",
    option_gender_male: "Еркек",
    option_gender_female: "Әйел",
    option_gender_non_binary: "Бинарлы емес",

    // Age Options
    option_age_keep: "Қазіргіні сақтау",
    option_age_child: "Бала",
    option_age_teen: "Жасөспірім",
    option_age_young_adult: "Жас ересек",
    option_age_middle_aged: "Орта жастағы",
    option_age_elderly: "Кәрі",

    // Ethnicity Options
    option_ethnicity_keep: "Қазіргіні сақтау",
    option_ethnicity_caucasian: "Еуропалық",
    option_ethnicity_african: "Африкалық",
    option_ethnicity_asian: "Азиялық",
    option_ethnicity_hispanic: "Латын американдық",
    option_ethnicity_middle_eastern: "Таяу Шығыстық",
    option_ethnicity_mixed: "Аралас",

    // Style Options
    option_style_casual: "Күнделікті",
    option_style_formal: "Ресми",
    option_style_sporty: "Спорттық",
    option_style_trendy: "Сәнді"
  }
};