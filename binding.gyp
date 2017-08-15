{
  "targets": [
    {
        "target_name": "addon",
        "sources": [
            "src/detectors/addons.cc",
            "src/detectors/yin/addon/yin.cc",
            "src/detectors/macleod/addon/macleod.cc"
        ],
        "include_dirs" : [
            "<!(node -e \"require('nan')\")"
        ]
    }
  ]
}
